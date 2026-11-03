<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuoteRequest;
use App\Models\Client;
use App\Models\Issuer;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Services\QuoteCalculator;
use App\Services\QuotePdfService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class QuoteController extends Controller
{
    public function __construct(private QuoteCalculator $calculator, private QuotePdfService $pdfs) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $quotes = Quote::query()
            ->visibleTo($request->user())
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('number', 'like', "%{$search}%")
                ->orWhere('name', 'like', "%{$search}%")
                ->orWhere('client_data->name', 'like', "%{$search}%")))
            ->with(['items', 'seller:id,name'])
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Quote $q) => [
                'id' => $q->id,
                'number' => $q->number,
                'name' => $q->name,
                'date' => $q->date?->toDateString(),
                'due_date' => $q->due_date?->toDateString(),
                'client' => $q->client_data['name'] ?? null,
                'issuer' => $q->issuer_data['name'] ?? null,
                'opportunity_id' => $q->opportunity_id,
                'seller' => $q->seller?->name,
                'currency' => $q->currency,
                'exchange_rate' => $q->exchange_rate,
                'total' => $q->total,
                'subtotal' => $q->subtotal,
                'tax_amount' => $q->tax_amount,
                'global_discount_amount' => $q->global_discount_amount,
                'summary_cost' => $q->summary_cost,
                'summary_profit' => $q->summary_profit,
                'summary_margin_percent' => $q->summary_margin_percent,
                'has_payment_plan' => $q->has_payment_plan,
                'first_payment_amount' => $q->first_payment_amount,
                'monthly_payment_amount' => $q->monthly_payment_amount,
                'payment_months' => $q->payment_months,
                'items' => $q->items->map(fn ($i) => [
                    'id' => $i->id,
                    'description' => $i->description,
                    'quantity' => $i->quantity,
                    'sale_total_price' => $i->sale_total_price,
                ])->values(),
            ]);

        return Inertia::render('quotes/index', [
            'isAdmin' => $request->user()->isAdmin(),
            'quotes' => $quotes,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('quotes/form', [
            'quote' => null,
            ...$this->catalogs(),
            'defaults' => [
                'date' => now()->toDateString(),
                'due_date' => now()->addDays(15)->toDateString(),
                ...$this->opportunityDefaults($request),
            ],
        ]);
    }

    public function store(QuoteRequest $request): RedirectResponse
    {
        $quote = DB::transaction(function () use ($request) {
            $quote = new Quote(['number' => Quote::generateNumber(), 'seller_id' => $request->user()->id]);

            return $this->persist($quote, $request);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización creada.']);

        return to_route('quotes.edit', $quote);
    }

    public function edit(Quote $quote): Response
    {
        Gate::allowIf($quote->isAccessibleBy(auth()->user()));
        $quote->load('items');

        return Inertia::render('quotes/form', [
            'quote' => $quote->toArray(),
            // Últimos envíos por correo de esta cotización.
            'emails' => $quote->emails()->with('user:id,name')->limit(5)->get()->map(fn ($e) => [
                'id' => $e->id,
                'to' => $e->to,
                'subject' => $e->subject,
                'attachment' => $e->attachment,
                'sent_at' => $e->sent_at?->toIso8601String(),
                'user' => $e->user?->name,
            ]),
            ...$this->catalogs(),
            'defaults' => null,
        ]);
    }

    public function update(QuoteRequest $request, Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isAccessibleBy($request->user()));

        DB::transaction(fn () => $this->persist($quote, $request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización guardada.']);

        return back();
    }

    public function destroy(Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isAccessibleBy(auth()->user()));
        $quote->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización eliminada.']);

        return to_route('quotes.index');
    }

    /** Copia la cotización y sus partidas tal cual, sin recalcular (§10.2). */
    public function duplicate(Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isAccessibleBy(auth()->user()));

        $copy = DB::transaction(function () use ($quote) {
            $copy = $quote->replicate();
            $copy->number = Quote::generateNumber();
            $copy->name = $quote->name.'-copia';
            $copy->active_with_client = false;
            $copy->save();

            foreach ($quote->items as $item) {
                $copy->items()->create($item->replicate()->getAttributes());
            }

            return $copy;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización duplicada.']);

        return to_route('quotes.edit', $copy);
    }

    /** PDF interno (calculadora) o de cliente. type: internal | client_mxn | client_usd */
    public function pdf(Request $request, Quote $quote)
    {
        Gate::allowIf($quote->isAccessibleBy($request->user()));
        $quote->load('items', 'seller');

        $type = $request->query('type', 'internal');
        abort_unless(in_array($type, QuotePdfService::TYPES, true), 404);

        $pdf = $this->pdfs->make($quote, $type);
        $file = $this->pdfs->filename($quote, $type);
        $download = $request->boolean('download');

        return $download ? $pdf->download($file) : $pdf->stream($file);
    }

    /** Calcula en servidor sin guardar (para vista previa/consistencia). */
    public function calculate(Request $request)
    {
        return response()->json($this->calculator->calculate(
            $request->input(), $request->input('items', [])
        ));
    }

    private function persist(Quote $quote, QuoteRequest $request): Quote
    {
        $data = $request->validated();
        $result = $this->calculator->calculate($data, $data['items']);

        $client = ! empty($data['client_id']) ? Client::visibleTo($request->user())->find($data['client_id']) : null;
        $issuer = ! empty($data['issuer_id']) ? Issuer::find($data['issuer_id']) : null;

        // Los snapshots sólo se re-copian si cambió la selección (conservan el dato histórico).
        $clientData = $client
            ? ($quote->client_id === $client->id && $quote->client_data ? $quote->client_data : $client->snapshot())
            : null;
        $issuerData = $issuer
            ? ($quote->issuer_id === $issuer->id && $quote->issuer_data ? $quote->issuer_data : $issuer->snapshot())
            : null;

        $isCustom = $data['delivery_unit'] === 'personalizado';

        $quote->fill([
            'name' => $data['name'],
            'date' => $data['date'],
            'due_date' => $data['due_date'] ?? null,
            'delivery_unit' => $data['delivery_unit'],
            'delivery_days_min' => $isCustom ? 1 : ($data['delivery_days_min'] ?? 1),
            'delivery_days_max' => $isCustom ? 1 : ($data['delivery_days_max'] ?? 5),
            'notes' => $isCustom ? ($data['notes'] ?? null) : null,
            'client_id' => $client?->id,
            'client_data' => $clientData,
            'issuer_id' => $issuer?->id,
            'issuer_data' => $issuerData,
            'opportunity_id' => $data['opportunity_id'] ?? null,
            ...collect($result['quote'])->except('down_payment_warning')->all(),
        ])->save();

        // Al cambiar de oportunidad, la cotización es la vigente sólo si la oportunidad no tiene otra.
        if ($quote->wasChanged('opportunity_id') || ($quote->wasRecentlyCreated && $quote->opportunity_id)) {
            $quote->active_with_client = $quote->opportunity_id !== null
                && ! Quote::where('opportunity_id', $quote->opportunity_id)
                    ->where('active_with_client', true)->where('id', '!=', $quote->id)->exists();
            $quote->save();
        }

        $quote->items()->delete();
        $quote->items()->createMany($result['items']);

        return $quote;
    }

    /** @return array<string, mixed> */
    private function catalogs(): array
    {
        return [
            'clients' => Client::visibleTo(auth()->user())->orderBy('name')->get(),
            'issuers' => Issuer::orderBy('name')->get(),
            'opportunities' => Opportunity::visibleTo(auth()->user())
                ->orderBy('name')->get(['id', 'name']),
        ];
    }

    /** Al crear desde una oportunidad (?opportunity=ID) se heredan oportunidad, cliente y nombre. */
    private function opportunityDefaults(Request $request): array
    {
        $opportunity = Opportunity::visibleTo($request->user())
            ->find($request->query('opportunity'));

        return $opportunity ? [
            'opportunity_id' => $opportunity->id,
            'client_id' => $opportunity->client_id,
            'name' => $opportunity->name,
        ] : [];
    }
}
