<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Módulo de gráficas: métricas de cotizaciones, oportunidades y ventas con filtros.
 * Toda la agregación se hace en PHP (no en SQL) para que funcione igual en SQLite y SQL Server.
 * Los importes se normalizan a MXN.
 */
class ReportController extends Controller
{
    /** Probabilidad de cierre por etapa, para el pronóstico ponderado. */
    private const WEIGHTS = [
        'oportunidad' => 0.10,
        'calificado' => 0.25,
        'dimensionamiento' => 0.50,
        'presentado' => 0.75,
    ];

    private const PERIODS = ['7d', '30d', '90d', 'month', 'year', '12m', 'custom'];

    public function __invoke(Request $request): Response
    {
        $sections = collect(self::SECTIONS)
            ->reject(fn ($label, $key) => $key === 'sellers' && ! $request->user()->isAdmin())
            ->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values();

        return Inertia::render('reports/index', [...$this->data($request), 'exportSections' => $sections]);
    }

    /** Secciones exportables al PDF: clave => etiqueta. */
    public const SECTIONS = [
        'kpis' => 'Indicadores clave',
        'trend' => 'Cotizado vs. ganado',
        'funnel' => 'Embudo de oportunidades',
        'outcome' => 'Ganadas vs. perdidas',
        'margin' => 'Margen y volumen de cotizaciones',
        'currencies' => 'Cotizado por moneda',
        'clients' => 'Principales clientes',
        'forecast' => 'Pronóstico de cierre',
        'open' => 'Oportunidades abiertas de mayor valor',
        'sellers' => 'Desempeño por vendedor (solo administrador)',
    ];

    /** Exporta el reporte en PDF con portada y marca, respetando filtros y secciones elegidas. */
    public function export(Request $request)
    {
        $user = $request->user();
        $data = $this->data($request);

        $requested = (array) $request->query('sections', array_keys(self::SECTIONS));
        $sections = array_values(array_filter(
            array_keys(self::SECTIONS),
            fn ($k) => in_array($k, $requested, true) && ($k !== 'sellers' || $user->isAdmin()),
        ));

        if ($sections === []) {
            $sections = ['kpis'];
        }

        $f = $data['filters'];
        $title = trim((string) $request->query('title')) ?: 'Reporte de ventas';
        $periods = ['7d' => 'Últimos 7 días', '30d' => 'Últimos 30 días', '90d' => 'Últimos 90 días',
            'month' => 'Mes actual', 'year' => 'Año en curso', '12m' => 'Últimos 12 meses', 'custom' => 'Periodo personalizado'];

        $pdf = Pdf::loadView('pdf.report', [
            ...$data,
            'title' => mb_substr($title, 0, 80),
            'sections' => $sections,
            'periodLabel' => $periods[$f['period']] ?? 'Periodo',
            'sellerName' => $f['seller'] ? collect($data['options']['sellers'])->firstWhere('id', $f['seller'])['name'] ?? null : null,
            'clientName' => $f['client'] ? Client::visibleTo($user)->whereKey($f['client'])->value('name') : null,
            'generatedBy' => $user->name,
            'generatedAt' => now(),
            'brand' => config('quotes.brand'),
            'scopeLabel' => $user->isAdmin() ? 'Todos los vendedores' : 'Solo mis datos',
        ])->setPaper('a4', 'portrait');

        // Pie de página y franja superior: se dibujan en código (los scripts PHP de la plantilla están deshabilitados).
        $pdf->render();
        $brandName = (string) ($brand['name'] ?? 'Defynia');
        $footer = $brandName.' · '.mb_substr($title, 0, 60);
        $fonts = $pdf->getDomPDF()->getFontMetrics();
        $regular = $fonts->getFont('DejaVu Sans', 'normal');
        $bold = $fonts->getFont('DejaVu Sans', 'bold');

        $pdf->getCanvas()->page_script(function ($page, $count, $canvas) use ($footer, $regular, $bold) {
            if ($page < 2) {
                return;
            }

            $w = $canvas->get_width();
            $h = $canvas->get_height();
            $canvas->filled_rectangle(0, 0, $w, 6, [0.231, 0.027, 0.392]);
            $canvas->filled_rectangle($w * 0.62, 0, $w * 0.38, 6, [0.427, 0.157, 0.851]);
            $canvas->line(40, $h - 44, $w - 40, $h - 44, [0.89, 0.87, 0.95], 0.6);
            $canvas->text(40, $h - 33, $footer, $regular, 7.5, [0.54, 0.50, 0.66]);
            $canvas->text($w - 108, $h - 33, 'Página '.($page - 1).' de '.($count - 1), $bold, 7.5, [0.18, 0.04, 0.36]);
        });

        return $pdf->download('reporte-ventas-'.now()->format('Ymd-His').'.pdf');
    }

    /** Datos del tablero (compartidos entre la vista y el PDF). */
    private function data(Request $request): array
    {
        $user = $request->user();
        [$period, $from, $to] = $this->range($request);

        $days = (int) $from->diffInDays($to) + 1;
        $prevTo = $from->copy()->subDay()->endOfDay();
        $prevFrom = $prevTo->copy()->subDays($days - 1)->startOfDay();

        $sellerId = $user->isAdmin() && $request->filled('seller') ? (int) $request->query('seller') : null;
        $clientId = $request->filled('client') ? (int) $request->query('client') : null;

        $quotes = Quote::visibleTo($user)
            ->when($sellerId, fn ($q) => $q->where('seller_id', $sellerId))
            ->when($clientId, fn ($q) => $q->where('client_id', $clientId))
            ->whereBetween('date', [$prevFrom->toDateString(), $to->toDateString()])
            ->get(['id', 'number', 'name', 'date', 'seller_id', 'client_id', 'client_data', 'currency',
                'exchange_rate', 'total', 'total_mxn_equivalent', 'summary_profit', 'summary_sale_total'])
            ->each(function (Quote $q) {
                $rate = $this->rate($q);
                $q->setAttribute('mxn', $q->total * $rate);
                $q->setAttribute('profit_mxn', $q->summary_profit * $rate);
                $q->setAttribute('sale_mxn', $q->summary_sale_total * $rate);
            });

        $opps = Opportunity::visibleTo($user)
            ->when($sellerId, fn ($q) => $q->where('owner_id', $sellerId))
            ->when($clientId, fn ($q) => $q->where('client_id', $clientId))
            ->with(['quotes:id,opportunity_id,currency,total,exchange_rate,active_with_client', 'client:id,name'])
            ->get()
            ->each(fn (Opportunity $o) => $o->setAttribute('mxn', (float) $o->value()['amount_mxn']));

        $names = User::pluck('name', 'id');
        $inRange = fn (CarbonInterface $d) => $d->between($from, $to);
        $closedAt = fn (Opportunity $o) => $o->closed_at ?? $o->updated_at;

        $kpi = fn (CarbonInterface $a, CarbonInterface $b) => $this->kpis($quotes, $opps, $a, $b, $closedAt);
        $current = $kpi($from, $to);
        $previous = $kpi($prevFrom, $prevTo);

        $open = $opps->whereNotIn('stage', Opportunity::CLOSED);
        $weighted = $open->sum(fn (Opportunity $o) => $o->mxn * (self::WEIGHTS[$o->stage] ?? 0));

        $periodQuotes = $quotes->filter(fn (Quote $q) => $inRange($q->date->copy()->startOfDay()));
        $wonOpps = $opps->filter(fn (Opportunity $o) => $o->stage === 'ganado' && $inRange($closedAt($o)));
        $lostOpps = $opps->filter(fn (Opportunity $o) => $o->stage === 'perdido' && $inRange($closedAt($o)));

        return [
            'filters' => [
                'period' => $period,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'seller' => $sellerId,
                'client' => $clientId,
            ],
            'range' => ['days' => $days, 'from' => $from->toDateString(), 'to' => $to->toDateString()],
            'kpis' => [
                'current' => $current,
                'previous' => $previous,
                'pipeline_open' => round($open->sum('mxn'), 2),
                'pipeline_count' => $open->count(),
                'pipeline_weighted' => round($weighted, 2),
            ],
            'series' => $this->series($quotes, $wonOpps, $from, $to, $days, $closedAt),
            'bucket' => $days <= 31 ? 'day' : ($days <= 120 ? 'week' : 'month'),
            'funnel' => collect(Opportunity::STAGES)->map(function ($label, $stage) use ($opps, $inRange) {
                $list = $opps->filter(fn (Opportunity $o) => $o->stage === $stage && $inRange($o->created_at));

                return ['stage' => $stage, 'label' => $label, 'count' => $list->count(), 'amount' => round($list->sum('mxn'), 2)];
            })->values(),
            'outcome' => [
                'won' => ['count' => $wonOpps->count(), 'amount' => round($wonOpps->sum('mxn'), 2)],
                'lost' => ['count' => $lostOpps->count(), 'amount' => round($lostOpps->sum('mxn'), 2)],
            ],
            'lostReasons' => $lostOpps
                ->map(fn (Opportunity $o) => trim((string) $o->lost_reason) ?: 'Sin motivo')
                ->countBy()->sortDesc()->take(5)
                ->map(fn ($count, $reason) => ['reason' => $reason, 'count' => $count])->values(),
            'topClients' => $periodQuotes
                ->groupBy(fn (Quote $q) => $q->client_data['name'] ?? 'Sin cliente')
                ->map(fn (Collection $g, $name) => ['name' => $name, 'quotes' => $g->count(), 'amount' => round($g->sum('mxn'), 2)])
                ->sortByDesc('amount')->take(6)->values(),
            'currencies' => $periodQuotes->groupBy('currency')
                ->map(fn (Collection $g, $cur) => ['currency' => $cur, 'quotes' => $g->count(), 'amount' => round($g->sum('mxn'), 2)])
                ->sortByDesc('amount')->values(),
            'forecast' => $this->forecast($open),
            'topOpen' => $open->sortByDesc('mxn')->take(6)->map(fn (Opportunity $o) => [
                'id' => $o->id,
                'name' => $o->name,
                'client' => $o->client?->name,
                'stage' => $o->stage,
                'stage_label' => Opportunity::STAGES[$o->stage] ?? $o->stage,
                'amount' => round($o->mxn, 2),
                'expected_close_date' => $o->expected_close_date?->toDateString(),
                'owner' => $names[$o->owner_id] ?? null,
            ])->values(),
            // Ranking por vendedor: sólo lo ve el administrador.
            'sellers' => $user->isAdmin() ? $this->sellers($periodQuotes, $wonOpps, $lostOpps, $names) : null,
            'options' => [
                'sellers' => $user->isAdmin()
                    ? User::orderBy('name')->get(['id', 'name'])->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->values()
                    : [],
                'clients' => Client::visibleTo($user)->orderBy('name')->limit(500)->get(['id', 'name'])
                    ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->values(),
            ],
        ];
    }

    /** @return array{0: string, 1: CarbonInterface, 2: CarbonInterface} */
    private function range(Request $request): array
    {
        $period = in_array($request->query('period'), self::PERIODS, true) ? $request->query('period') : '90d';
        $today = now()->endOfDay();

        if ($period === 'custom') {
            try {
                $from = Carbon::parse((string) $request->query('from'))->startOfDay();
                $to = Carbon::parse((string) $request->query('to'))->endOfDay();
            } catch (\Throwable) {
                return ['90d', $today->copy()->subDays(89)->startOfDay(), $today];
            }

            if ($from->gt($to)) {
                [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
            }

            // Tope de 3 años para no construir series enormes.
            if ($from->diffInDays($to) > 1095) {
                $from = $to->copy()->subDays(1095)->startOfDay();
            }

            return [$period, $from, $to];
        }

        return match ($period) {
            '7d' => [$period, $today->copy()->subDays(6)->startOfDay(), $today],
            '30d' => [$period, $today->copy()->subDays(29)->startOfDay(), $today],
            'month' => [$period, now()->startOfMonth(), $today],
            'year' => [$period, now()->startOfYear(), $today],
            '12m' => [$period, now()->subMonths(11)->startOfMonth(), $today],
            default => [$period, $today->copy()->subDays(89)->startOfDay(), $today],
        };
    }

    /** Factor para llevar el importe de una cotización a MXN. */
    private function rate(Quote $q): float
    {
        if ($q->currency === 'MXN') {
            return 1.0;
        }

        if ($q->total_mxn_equivalent !== null && $q->total > 0) {
            return (float) $q->total_mxn_equivalent / (float) $q->total;
        }

        return (float) ($q->exchange_rate ?: 1);
    }

    private function kpis(Collection $quotes, Collection $opps, CarbonInterface $a, CarbonInterface $b, \Closure $closedAt): array
    {
        $qs = $quotes->filter(fn (Quote $q) => $q->date->copy()->startOfDay()->between($a, $b));
        $won = $opps->filter(fn (Opportunity $o) => $o->stage === 'ganado' && $closedAt($o)->between($a, $b));
        $lost = $opps->filter(fn (Opportunity $o) => $o->stage === 'perdido' && $closedAt($o)->between($a, $b));
        $closed = $won->count() + $lost->count();
        $sale = $qs->sum('sale_mxn');

        return [
            'quoted' => round($qs->sum('mxn'), 2),
            'quotes' => $qs->count(),
            'won' => round($won->sum('mxn'), 2),
            'won_count' => $won->count(),
            'lost_count' => $lost->count(),
            'win_rate' => $closed > 0 ? round($won->count() / $closed * 100, 1) : null,
            'avg_ticket' => $won->count() > 0 ? round($won->sum('mxn') / $won->count(), 2) : null,
            'margin' => $sale > 0 ? round($qs->sum('profit_mxn') / $sale * 100, 1) : null,
            'new_opps' => $opps->filter(fn (Opportunity $o) => $o->created_at->between($a, $b))->count(),
        ];
    }

    /** Serie temporal: cotizado, ganado y margen por día, semana o mes según la amplitud del rango. */
    private function series(Collection $quotes, Collection $won, CarbonInterface $from, CarbonInterface $to, int $days, \Closure $closedAt): array
    {
        $key = fn (CarbonInterface $d) => match (true) {
            $days <= 31 => $d->format('Y-m-d'),
            $days <= 120 => $d->copy()->startOfWeek()->format('Y-m-d'),
            default => $d->format('Y-m-01'),
        };

        $rows = [];
        $cursor = $from->copy();

        while ($cursor->lte($to)) {
            $rows[$key($cursor)] ??= ['date' => $key($cursor), 'quoted' => 0.0, 'won' => 0.0, 'quotes' => 0, 'profit' => 0.0, 'sale' => 0.0];
            $cursor = $cursor->addDay();
        }

        foreach ($quotes as $q) {
            $d = $q->date->copy()->startOfDay();

            if ($d->between($from, $to)) {
                $r = &$rows[$key($d)];
                $r['quoted'] += $q->mxn;
                $r['quotes']++;
                $r['profit'] += $q->profit_mxn;
                $r['sale'] += $q->sale_mxn;
                unset($r);
            }
        }

        foreach ($won as $o) {
            $r = &$rows[$key($closedAt($o))];
            $r['won'] += $o->mxn;
            unset($r);
        }

        return collect($rows)->map(fn ($r) => [
            'date' => $r['date'],
            'quoted' => round($r['quoted'], 2),
            'won' => round($r['won'], 2),
            'quotes' => $r['quotes'],
            'margin' => $r['sale'] > 0 ? round($r['profit'] / $r['sale'] * 100, 1) : null,
        ])->values()->all();
    }

    /** Pipeline abierto por mes de cierre esperado (próximos 6 meses) más lo vencido o sin fecha. */
    private function forecast(Collection $open): array
    {
        $rows = [];

        for ($i = 0; $i < 6; $i++) {
            $m = now()->startOfMonth()->addMonths($i);
            $rows[$m->format('Y-m')] = ['month' => $m->format('Y-m-01'), 'amount' => 0.0, 'weighted' => 0.0, 'count' => 0];
        }

        $overdue = ['amount' => 0.0, 'count' => 0];
        $undated = ['amount' => 0.0, 'count' => 0];

        foreach ($open as $o) {
            $w = $o->mxn * (self::WEIGHTS[$o->stage] ?? 0);

            if (! $o->expected_close_date) {
                $undated['amount'] += $o->mxn;
                $undated['count']++;
            } elseif ($o->expected_close_date->lt(now()->startOfMonth())) {
                $overdue['amount'] += $o->mxn;
                $overdue['count']++;
            } elseif (isset($rows[$o->expected_close_date->format('Y-m')])) {
                $r = &$rows[$o->expected_close_date->format('Y-m')];
                $r['amount'] += $o->mxn;
                $r['weighted'] += $w;
                $r['count']++;
                unset($r);
            }
        }

        return [
            'months' => collect($rows)->map(fn ($r) => [
                ...$r, 'amount' => round($r['amount'], 2), 'weighted' => round($r['weighted'], 2),
            ])->values()->all(),
            'overdue' => ['amount' => round($overdue['amount'], 2), 'count' => $overdue['count']],
            'undated' => ['amount' => round($undated['amount'], 2), 'count' => $undated['count']],
        ];
    }

    private function sellers(Collection $quotes, Collection $won, Collection $lost, Collection $names): array
    {
        $ids = $quotes->pluck('seller_id')
            ->merge($won->pluck('owner_id'))->merge($lost->pluck('owner_id'))->unique();

        return $ids->map(function ($id) use ($quotes, $won, $lost, $names) {
            $q = $quotes->where('seller_id', $id);
            $w = $won->where('owner_id', $id);
            $l = $lost->where('owner_id', $id);
            $closed = $w->count() + $l->count();

            return [
                'id' => $id,
                'name' => $names[$id] ?? 'Usuario eliminado',
                'quotes' => $q->count(),
                'quoted' => round($q->sum('mxn'), 2),
                'won_count' => $w->count(),
                'won' => round($w->sum('mxn'), 2),
                'win_rate' => $closed > 0 ? round($w->count() / $closed * 100, 1) : null,
            ];
        })->sortByDesc('won')->values()->all();
    }
}
