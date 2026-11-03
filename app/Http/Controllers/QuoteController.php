<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuoteRequest;
use App\Models\Client;
use App\Models\Issuer;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Services\QuoteCalculator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class QuoteController extends Controller
{
    public function __construct(private QuoteCalculator $calculator) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $quotes = Quote::query()
            ->where('seller_id', $request->user()->id)
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('number', 'like', "%{$search}%")
                ->orWhere('name', 'like', "%{$search}%")
                ->orWhere('client_data->name', 'like', "%{$search}%")))
            ->with('items')
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
        Gate::allowIf($quote->isOwnedBy(auth()->user()));
        $quote->load('items');

        return Inertia::render('quotes/form', [
            'quote' => $quote->toArray(),
            ...$this->catalogs(),
            'defaults' => null,
        ]);
    }

    public function update(QuoteRequest $request, Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isOwnedBy($request->user()));

        DB::transaction(fn () => $this->persist($quote, $request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización guardada.']);

        return back();
    }

    public function destroy(Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isOwnedBy(auth()->user()));
        $quote->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cotización eliminada.']);

        return to_route('quotes.index');
    }

    /** Copia la cotización y sus partidas tal cual, sin recalcular (§10.2). */
    public function duplicate(Quote $quote): RedirectResponse
    {
        Gate::allowIf($quote->isOwnedBy(auth()->user()));

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
        Gate::allowIf($quote->isOwnedBy($request->user()));
        $quote->load('items', 'seller');

        $type = $request->query('type', 'internal');
        $download = $request->boolean('download');

        if ($type === 'internal') {
            $pdf = Pdf::loadView('pdf.quote', ['quote' => $quote, 'fx' => $quote->exchange_rate])
                ->setPaper('a4', 'landscape');
        } else {
            $mode = $type === 'client_usd' ? 'usd' : 'mxn';
            $pdf = Pdf::loadView('pdf.quote-client', $this->clientPdfData($quote, $mode))
                ->setPaper('a4', 'portrait');
        }

        $file = $quote->number.'-'.$type.'.pdf';

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

        $client = ! empty($data['client_id']) ? Client::find($data['client_id']) : null;
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
            'clients' => Client::orderBy('name')->get(),
            'issuers' => Issuer::orderBy('name')->get(),
            'opportunities' => Opportunity::where('owner_id', auth()->id())
                ->orderBy('name')->get(['id', 'name']),
        ];
    }

    /** Al crear desde una oportunidad (?opportunity=ID) se heredan oportunidad, cliente y nombre. */
    private function opportunityDefaults(Request $request): array
    {
        $opportunity = Opportunity::where('owner_id', $request->user()->id)
            ->find($request->query('opportunity'));

        return $opportunity ? [
            'opportunity_id' => $opportunity->id,
            'client_id' => $opportunity->client_id,
            'name' => $opportunity->name,
        ] : [];
    }

    /**
     * Prepara los montos del PDF cliente en la divisa de salida (§9.2).
     *
     * @return array<string, mixed>
     */
    private function clientPdfData(Quote $quote, string $mode): array
    {
        $out = strtoupper($mode);
        $from = $quote->currency;
        $fx = $quote->exchange_rate ?: 1;

        $factor = match (true) {
            $from === $out => 1.0,
            $from === 'MXN' && $out === 'USD' => 1 / $fx,
            default => $fx,
        };

        $dec = QuoteCalculator::decimals($out);
        $subtotal = $quote->subtotal * $factor;
        $tax = $quote->tax_amount * $factor;
        $discount = $quote->global_discount_amount * $factor;

        if ($from !== 'MXN' && $out === 'MXN') {
            $subtotal = $quote->subtotal_mxn ?? $subtotal;
            $tax = $quote->tax_amount_mxn ?? $tax;
            $discount = $quote->global_discount_amount * $fx;
        }

        $totalBefore = $subtotal + $tax;
        $discount = max(min($discount, $totalBefore), 0);
        $total = $totalBefore - $discount;

        $schedule = null;
        if ($quote->has_payment_plan && $quote->payment_months >= 1 && $total > 0) {
            $first = $quote->first_payment_type === 'fixed'
                ? min((float) $quote->first_payment_value * $factor, $total)
                : $total * (min((float) $quote->first_payment_value, 100) / 100);
            $schedule = $this->calculator->schedule(
                round($total, $dec), round(max($first, 0), $dec),
                (int) $quote->payment_months, $quote->first_payment_date?->toDateString(), $dec
            );
        }

        return [
            'quote' => $quote,
            'mode' => $mode,
            'currency' => $out,
            'factor' => $factor,
            'useMxnFields' => $from !== 'MXN' && $out === 'MXN',
            'dec' => $dec,
            'subtotal' => round($subtotal, $dec),
            'tax' => round($tax, $dec),
            'totalBefore' => round($totalBefore, $dec),
            'discount' => round($discount, $dec),
            'hasDiscount' => round($discount, 2) > 0,
            'total' => round($total, $dec),
            'schedule' => $schedule,
            'issuer' => $this->issuerFallback($quote->issuer_data ?? []),
        ];
    }

    /** Nunca imprime un emisor vacío: completa con los datos de la empresa dueña. */
    private function issuerFallback(array $issuer): array
    {
        $brand = config('quotes.brand');

        return collect($brand)->map(fn ($v, $k) => ! empty($issuer[$k]) ? $issuer[$k] : $v)->all();
    }
}
