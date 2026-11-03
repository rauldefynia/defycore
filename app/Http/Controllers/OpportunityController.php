<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Opportunity;
use App\Models\Quote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OpportunityController extends Controller
{
    /** Pipeline (tablero kanban) del usuario. */
    public function index(Request $request): Response
    {
        $opportunities = Opportunity::query()
            ->visibleTo($request->user())
            ->with(['client:id,name', 'owner:id,name', 'quotes'])
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->map(fn (Opportunity $o) => $this->present($o))
            ->values();

        return Inertia::render('opportunities/index', [
            'opportunities' => $opportunities,
            'stages' => $this->stages(),
            'clients' => Client::visibleTo($request->user())->orderBy('name')->get(['id', 'name']),
            'isAdmin' => $request->user()->isAdmin(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $opportunity = Opportunity::create($data + [
            'owner_id' => $request->user()->id,
            'stage' => 'oportunidad',
            'position' => Opportunity::nextPosition($request->user()->id, 'oportunidad'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Oportunidad creada.']);

        return $request->boolean('open')
            ? to_route('opportunities.show', $opportunity)
            : back();
    }

    public function show(Request $request, Opportunity $opportunity): Response
    {
        Gate::allowIf($opportunity->isAccessibleBy($request->user()));
        $opportunity->load(['client:id,name', 'quotes']);

        return Inertia::render('opportunities/show', [
            'opportunity' => $this->present($opportunity) + [
                'notes' => $opportunity->notes,
                'client_id' => $opportunity->client_id,
                'estimated_amount' => $opportunity->estimated_amount,
                'expected_close_date' => $opportunity->expected_close_date?->toDateString(),
                'lost_reason' => $opportunity->lost_reason,
            ],
            'quotes' => $opportunity->quotes->sortByDesc('id')->values()->map(fn (Quote $q) => $this->quoteRow($q)),
            'availableQuotes' => Quote::visibleTo($request->user())
                ->whereNull('opportunity_id')->latest('id')->get()
                ->map(fn (Quote $q) => $this->quoteRow($q))->values(),
            'stages' => $this->stages(),
            'clients' => Client::visibleTo($request->user())->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Opportunity $opportunity): RedirectResponse
    {
        Gate::allowIf($opportunity->isAccessibleBy($request->user()));
        $opportunity->update($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Oportunidad actualizada.']);

        return back();
    }

    public function destroy(Request $request, Opportunity $opportunity): RedirectResponse
    {
        Gate::allowIf($opportunity->isAccessibleBy($request->user()));
        // Las cotizaciones se conservan (opportunity_id pasa a null).
        $opportunity->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Oportunidad eliminada. Sus cotizaciones se conservaron.']);

        return to_route('opportunities.index');
    }

    /** Mueve la oportunidad de etapa y/o posición (drag & drop). */
    public function move(Request $request, Opportunity $opportunity): RedirectResponse
    {
        Gate::allowIf($opportunity->isAccessibleBy($request->user()));

        $data = $request->validate([
            'stage' => ['required', Rule::in(array_keys(Opportunity::STAGES))],
            'before_id' => ['nullable', 'integer'],
            'lost_reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($data['stage'] === 'perdido' && $opportunity->stage !== 'perdido' && blank($data['lost_reason'] ?? null)) {
            throw ValidationException::withMessages(['lost_reason' => 'Indica el motivo de la pérdida.']);
        }

        DB::transaction(function () use ($opportunity, $data, $request) {
            $stage = $data['stage'];
            $changed = $opportunity->stage !== $stage;

            if ($changed) {
                $opportunity->stage = $stage;
                $opportunity->closed_at = in_array($stage, Opportunity::CLOSED, true) ? now() : null;
                $opportunity->lost_reason = $stage === 'perdido' ? $data['lost_reason'] : null;
            }
            $opportunity->save();

            $ids = Opportunity::visibleTo($request->user())
                ->where('stage', $stage)->where('id', '!=', $opportunity->id)
                ->orderBy('position')->orderBy('id')->pluck('id')->all();

            $at = ! empty($data['before_id']) ? array_search((int) $data['before_id'], $ids, true) : false;
            array_splice($ids, $at === false ? count($ids) : $at, 0, [$opportunity->id]);

            foreach ($ids as $i => $id) {
                Opportunity::whereKey($id)->update(['position' => $i + 1]);
            }
        });

        return back();
    }

    /** Anexa una cotización existente a la oportunidad. */
    public function attachQuote(Request $request, Opportunity $opportunity): RedirectResponse
    {
        Gate::allowIf($opportunity->isAccessibleBy($request->user()));
        $data = $request->validate(['quote_id' => ['required', 'integer', 'exists:quotes,id']]);

        $quote = Quote::findOrFail($data['quote_id']);
        Gate::allowIf($quote->isAccessibleBy($request->user()));

        $this->attach($opportunity, $quote);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización anexada.']);

        return back();
    }

    public function detachQuote(Request $request, Opportunity $opportunity, Quote $quote): RedirectResponse
    {
        Gate::allowIf($opportunity->isAccessibleBy($request->user()));
        abort_unless((int) $quote->opportunity_id === $opportunity->id, 404);

        $wasActive = $quote->active_with_client;
        $quote->update(['opportunity_id' => null, 'active_with_client' => false]);

        // Si se quitó la vigente, la más reciente toma su lugar.
        if ($wasActive && ($next = $opportunity->quotes()->latest('id')->first())) {
            $next->update(['active_with_client' => true]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización desanexada.']);

        return back();
    }

    /** Marca una sola cotización como vigente dentro de la oportunidad (§10.3). */
    public function activateQuote(Request $request, Opportunity $opportunity, Quote $quote): RedirectResponse
    {
        Gate::allowIf($opportunity->isAccessibleBy($request->user()));
        abort_unless((int) $quote->opportunity_id === $opportunity->id, 404);

        DB::transaction(function () use ($opportunity, $quote) {
            $opportunity->quotes()->update(['active_with_client' => false]);
            $quote->update(['active_with_client' => true]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización marcada como vigente.']);

        return back();
    }

    /** Convierte una cotización en una oportunidad nueva. */
    public function fromQuote(Request $request, Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isAccessibleBy($request->user()));

        if ($quote->opportunity_id) {
            Inertia::flash('toast', ['type' => 'info', 'message' => 'La cotización ya pertenece a una oportunidad.']);

            return to_route('opportunities.show', $quote->opportunity_id);
        }

        $opportunity = DB::transaction(function () use ($quote, $request) {
            $opportunity = Opportunity::create([
                'name' => $quote->name,
                'owner_id' => $request->user()->id,
                'client_id' => $quote->client_id,
                'stage' => 'oportunidad',
                'position' => Opportunity::nextPosition($request->user()->id, 'oportunidad'),
            ]);
            $this->attach($opportunity, $quote);

            return $opportunity;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Oportunidad creada a partir de la cotización.']);

        return to_route('opportunities.show', $opportunity);
    }

    private function attach(Opportunity $opportunity, Quote $quote): void
    {
        $hasActive = $opportunity->quotes()->where('active_with_client', true)->exists();

        $quote->update([
            'opportunity_id' => $opportunity->id,
            'active_with_client' => ! $hasActive,
        ]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'client_id' => ['nullable', Client::existsRule($request->user())],
            'estimated_amount' => ['nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
        $data['estimated_amount'] = $data['estimated_amount'] ?? 0;

        return $data;
    }

    /** @return array<int, array{key: string, label: string}> */
    private function stages(): array
    {
        return collect(Opportunity::STAGES)
            ->map(fn ($label, $key) => ['key' => $key, 'label' => $label])
            ->values()->all();
    }

    /** @return array<string, mixed> */
    private function present(Opportunity $o): array
    {
        return [
            'id' => $o->id,
            'name' => $o->name,
            'stage' => $o->stage,
            'position' => $o->position,
            'client' => $o->client?->name,
            'owner' => $o->owner?->name,
            'expected_close_date' => $o->expected_close_date?->toDateString(),
            'quotes_count' => $o->quotes->count(),
            'value' => $o->value(),
        ];
    }

    /** @return array<string, mixed> */
    private function quoteRow(Quote $q): array
    {
        return [
            'id' => $q->id,
            'number' => $q->number,
            'name' => $q->name,
            'date' => $q->date?->toDateString(),
            'due_date' => $q->due_date?->toDateString(),
            'currency' => $q->currency,
            'total' => $q->total,
            'active_with_client' => $q->active_with_client,
        ];
    }
}
