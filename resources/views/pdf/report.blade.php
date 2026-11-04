@php
    $money = fn ($v) => '$'.number_format((float) $v, 0, '.', ',');
    $short = function ($v) {
        $v = (float) $v;
        return match (true) {
            abs($v) >= 1e6 => '$'.number_format($v / 1e6, 1).'M',
            abs($v) >= 1e3 => '$'.number_format($v / 1e3, 1).'K',
            default => '$'.number_format($v, 0),
        };
    };
    $pct = fn ($v) => $v === null ? '—' : number_format($v, 1).'%';
    $delta = function ($cur, $prev) {
        if ($cur === null || $prev === null || (float) $prev == 0.0) return null;
        return (($cur - $prev) / abs($prev)) * 100;
    };
    $months = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    $dmy = function ($iso) use ($months) {
        $d = \Carbon\Carbon::parse($iso);
        return $d->format('d').' '.$months[(int) $d->format('n')].' '.$d->format('Y');
    };
    $label = function ($iso) use ($bucket, $months) {
        $d = \Carbon\Carbon::parse($iso);
        return $bucket === 'month' ? $months[(int) $d->format('n')].' '.$d->format('y') : $d->format('j').' '.$months[(int) $d->format('n')];
    };
    $stageColor = ['oportunidad' => '#94a3b8', 'calificado' => '#60a5fa', 'dimensionamiento' => '#a78bfa', 'presentado' => '#f59e0b', 'ganado' => '#16a34a', 'perdido' => '#e11d48'];
    $palette = ['#6d28d9', '#2563eb', '#16a34a', '#d97706', '#c026d3'];
    $has = fn ($k) => in_array($k, $sections, true);
    $c = $kpis['current']; $p = $kpis['previous'];
    $logo = file_exists(public_path('logo.png')) ? public_path('logo.png') : null;
    $coverImg = \App\Support\ReportBackdrop::cover();
    $footerText = preg_replace('/[^\p{L}\p{N} .,·-]/u', '', $brand['name'].' · '.$title);
    $n = 0;
    $num = function () use (&$n) { return str_pad(++$n, 2, '0', STR_PAD_LEFT); };
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{{ $title }}</title>
<style>
    @page { margin: 54px 40px 62px; }
    .page-head { border-bottom: 2px solid #3b0764; padding-bottom: 9px; margin-bottom: 16px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #2a2140; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: middle; }

    /* ---------- Portada ---------- */
    #cover { position: absolute; top: -54px; left: -40px; width: 595pt; height: 842pt; overflow: hidden; color: #fff; }
    #cover .img { position: absolute; top: 0; left: 0; width: 595pt; height: 842pt; }
    #cover .in { position: absolute; top: 0; left: 60px; width: 470pt; padding-top: 62px; }
    .pill { display: inline-block; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.35); border-radius: 20px; padding: 5px 14px; font-size: 8px; letter-spacing: 2px; color: #f0e7ff; }
    .ctitle { font-size: 38px; line-height: 1.12; font-weight: bold; margin: 26px 0 10px; color: #fff; }
    .clead { font-size: 13px; color: #e0d2fb; }
    .glass { background: rgba(255,255,255,0.13); border: 1px solid rgba(255,255,255,0.38); border-radius: 18px; }
    .glass-s { background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.30); border-radius: 14px; }
    .glass .k, .glass-s .k { font-size: 7.5px; letter-spacing: 1.5px; color: #cdb8f7; text-transform: uppercase; }
    .glass-s .v { font-size: 11px; color: #fff; margin-top: 3px; }
    .hl { font-size: 22px; font-weight: bold; color: #fff; margin-top: 4px; }
    #cover .foot { position: absolute; left: 60px; width: 470pt; top: 1010px; font-size: 8px; color: #cdb8f7; border-top: 1px solid rgba(255,255,255,0.28); padding-top: 9px; }

    /* ---------- Contenido ---------- */
    .card { background: #ffffff; border: 1px solid #e4def2; border-radius: 10px; padding: 14px 16px 12px; margin-bottom: 14px; page-break-inside: avoid; }
    .ch { margin-bottom: 11px; border-left: 4px solid #6d28d9; padding-left: 9px; }
    .ch .num { color: #8a7fa8; font-size: 8px; font-weight: bold; letter-spacing: 1px; margin-right: 6px; }
    .ch .t { font-size: 12.5px; font-weight: bold; color: #2e0a5c; }
    .ch .s { font-size: 8px; color: #8a7fa8; margin-top: 3px; }
    .sumrow td { padding: 6px 0; border-bottom: 1px solid #f0ecf8; vertical-align: top; }
    .sumrow .k { width: 92px; font-size: 7.5px; letter-spacing: 1px; text-transform: uppercase; color: #8a7fa8; padding-top: 8px; }
    .sumrow .tx { font-size: 9.5px; line-height: 1.5; color: #2a2140; }
    .big { background: #3b0764; border-radius: 10px; padding: 11px 12px 10px; }
    .big .l { font-size: 7px; letter-spacing: 1px; text-transform: uppercase; color: #cdb8f7; }
    .big .v { font-size: 18px; font-weight: bold; color: #fff; margin: 5px 0 3px; }
    .big .d { font-size: 7.5px; color: #d8c8fb; }

    .kpi { width: 25%; padding: 3px; }
    .kb { background: #faf8ff; border: 1px solid #e6defa; border-radius: 10px; padding: 8px 10px 7px; }
    .kb .l { font-size: 7px; letter-spacing: 1px; text-transform: uppercase; color: #8a7fa8; }
    .kb .v { font-size: 13px; font-weight: bold; color: #2e0a5c; margin: 4px 0 3px; }
    .kb .d { font-size: 7.5px; color: #8a7fa8; }
    .up { color: #15803d; font-weight: bold; } .down { color: #be123c; font-weight: bold; }
    .acc { height: 3px; border-radius: 2px; margin-bottom: 7px; }

    .track { background: #ece6fb; height: 9px; border-radius: 5px; }
    .fill { height: 9px; border-radius: 5px; }
    .r { text-align: right; white-space: nowrap; }

    table.t th { background: #efe9fd; color: #4c1d95; padding: 6px 7px; text-align: left; font-size: 7.5px; letter-spacing: 0.6px; text-transform: uppercase; }
    table.t td { padding: 6px 7px; border-bottom: 1px solid #efeaf9; }
    table.t tr.z td { background: #faf8ff; }
    .badge { color: #fff; border-radius: 9px; padding: 2px 7px; font-size: 7.5px; }
    .tag { display: inline-block; background: #f1ebff; color: #4c1d95; border-radius: 9px; padding: 2px 8px; font-size: 8px; margin: 0 4px 3px 0; }
    .tag.red { background: #ffe4e6; color: #9f1239; }
    .dot { display: inline-block; width: 7px; height: 7px; border-radius: 4px; margin-right: 4px; }
    .muted { color: #8a7fa8; }
    .grid { position: absolute; left: 0; width: 100%; border-top: 1px dashed #ddd3f5; }
    .gl { position: absolute; left: 0; font-size: 6.5px; color: #8a7fa8; }
</style>
</head>
<body>

{{-- ============ PORTADA ============ --}}
<div id="cover">
    @if ($coverImg)<img class="img" src="{{ $coverImg }}">@endif
    <div class="in">
        <table><tr>
            <td style="width:60%">
                @if ($logo)<img src="{{ $logo }}" style="height:40px">@else<b style="font-size:22px">{{ $brand['name'] }}</b>@endif
            </td>
            <td class="r"><span class="pill">REPORTE EJECUTIVO</span></td>
        </tr></table>

        <div style="margin-top:150px">
            <div class="clead" style="letter-spacing:3px;font-size:9px">VENTAS · COTIZACIONES · PIPELINE</div>
            <div class="ctitle">{{ $title }}</div>
            <div class="clead">{{ $periodLabel }} · {{ $dmy($range['from']) }} al {{ $dmy($range['to']) }}</div>
        </div>

        {{-- Cifras destacadas en cristal --}}
        <table style="margin-top:70px"><tr>
            @foreach ([['Total cotizado', $short($c['quoted']), $c['quotes'].' cotizaciones'], ['Ventas ganadas', $short($c['won']), $c['won_count'].' oportunidades'], ['Tasa de cierre', $pct($c['win_rate']), 'ganadas vs. perdidas']] as [$k, $v, $s])
                <td style="width:33.3%;padding:0 5px">
                    <div class="glass" style="padding:14px 14px 12px">
                        <div class="k">{{ $k }}</div>
                        <div class="hl">{{ $v }}</div>
                        <div style="font-size:7.5px;color:#d8c8fb;margin-top:3px">{{ $s }}</div>
                    </div>
                </td>
            @endforeach
        </tr></table>

        {{-- Datos del reporte --}}
        <table style="margin-top:34px">
            @foreach (array_chunk([
                ['Alcance', $sellerName ?? $scopeLabel],
                ['Cliente', $clientName ?? 'Todos los clientes'],
                ['Moneda', 'Importes en MXN'],
                ['Generado por', $generatedBy],
                ['Fecha de emisión', $generatedAt->format('d/m/Y H:i')],
                ['Secciones', count($sections).' incluidas'],
            ], 3) as $row)
                <tr>
                    @foreach ($row as [$k, $v])
                        <td style="width:33.3%;padding:5px">
                            <div class="glass-s" style="padding:9px 11px">
                                <div class="k">{{ $k }}</div>
                                <div class="v">{{ \Illuminate\Support\Str::limit($v, 26) }}</div>
                            </div>
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </table>
    </div>
    <div class="foot">
        {{ $brand['name'] }}@if (! empty($brand['website'])) · {{ $brand['website'] }}@endif
        &nbsp;·&nbsp; Documento confidencial de uso interno
    </div>
</div>
{{-- La portada es absoluta: este bloque fuerza el salto sin dejar una hoja en blanco --}}
<div style="height:1px;page-break-after:always"></div>

{{-- ============ CABECERA ============ --}}
<table class="page-head"><tr>
    <td style="width:50%">
        @if (file_exists(public_path('logo-dark.png')))<img src="{{ public_path('logo-dark.png') }}" style="height:26px">@else<b style="font-size:16px;color:#3b0764">{{ $brand['name'] }}</b>@endif
    </td>
    <td class="r">
        <b style="color:#2e0a5c;font-size:11px">{{ $title }}</b><br>
        <span class="muted" style="font-size:8px">{{ $periodLabel }} · {{ $dmy($range['from']) }} – {{ $dmy($range['to']) }}</span>
    </td>
</tr></table>

{{-- ============ RESUMEN EJECUTIVO ============ --}}
@php
    $vs = fn ($d) => $d === null ? '' : ' ('.($d >= 0 ? '+' : '−').number_format(abs($d), 1).'% vs. periodo anterior)';
    $dq = $delta($c['quoted'], $p['quoted']);
    $dw = $delta($c['won'], $p['won']);
    $summary = [
        ['Cotización', '#6d28d9', 'Se emitieron <b>'.$c['quotes'].' cotizaciones</b> por <b>'.$money($c['quoted']).'</b>'.$vs($dq).'.'.($c['margin'] !== null ? ' Margen promedio de <b>'.$pct($c['margin']).'</b>.' : '')],
        ['Ventas', '#16a34a', 'Se ganaron <b>'.$c['won_count'].' oportunidades</b> por <b>'.$money($c['won']).'</b>'.$vs($dw).'.'.($c['win_rate'] !== null ? ' Tasa de cierre de <b>'.$pct($c['win_rate']).'</b> ('.$c['won_count'].' ganadas, '.$c['lost_count'].' perdidas).' : ' Aún no hay oportunidades cerradas en el periodo.')],
        ['Pipeline', '#2563eb', 'Hay <b>'.$kpis['pipeline_count'].' oportunidades abiertas</b> por <b>'.$money($kpis['pipeline_open']).'</b>; el pronóstico ponderado por etapa es de <b>'.$money($kpis['pipeline_weighted']).'</b>.'],
    ];
    if ($forecast['overdue']['count'] > 0) {
        $summary[] = ['Atención', '#e11d48', '<b>'.$forecast['overdue']['count'].' oportunidades vencidas</b> ('.$money($forecast['overdue']['amount']).') con fecha de cierre ya superada.'.($forecast['undated']['count'] ? ' Además '.$forecast['undated']['count'].' sin fecha de cierre.' : '')];
    } elseif ($forecast['undated']['count'] > 0) {
        $summary[] = ['Atención', '#d97706', '<b>'.$forecast['undated']['count'].' oportunidades</b> ('.$money($forecast['undated']['amount']).') no tienen fecha de cierre esperada.'];
    }
    if (count($lostReasons)) {
        $summary[] = ['Pérdidas', '#e11d48', 'Motivo más frecuente de pérdida: <b>'.e($lostReasons[0]['reason']).'</b> ('.$lostReasons[0]['count'].').'];
    }
@endphp
<div class="card">
    <div class="ch"><span class="t">Resumen ejecutivo</span><div class="s">Lo más relevante del periodo en pocas líneas.</div></div>
    <table class="sumrow">
        @foreach ($summary as [$k, $col, $tx])
            <tr>
                <td class="k"><span class="dot" style="background:{{ $col }}"></span>{{ $k }}</td>
                <td class="tx">{!! $tx !!}</td>
            </tr>
        @endforeach
    </table>
</div>

{{-- ============ INDICADORES ============ --}}
@if ($has('kpis'))
@php
    $big = [
        ['Total cotizado', $money($c['quoted']), $c['quotes'].' cotizaciones', $dq],
        ['Ventas ganadas', $money($c['won']), $c['won_count'].' oportunidades', $dw],
        ['Tasa de cierre', $pct($c['win_rate']), $c['won_count'].' ganadas · '.$c['lost_count'].' perdidas', $delta($c['win_rate'], $p['win_rate'])],
        ['Pipeline abierto', $money($kpis['pipeline_open']), $kpis['pipeline_count'].' oportunidades', null],
    ];
    $small = [
        ['Margen promedio', $pct($c['margin']), 'sobre lo cotizado', $delta($c['margin'], $p['margin']), '#d97706'],
        ['Pronóstico ponderado', $money($kpis['pipeline_weighted']), 'por probabilidad de etapa', null, '#2563eb'],
        ['Ticket promedio', $c['avg_ticket'] === null ? '—' : $money($c['avg_ticket']), 'por venta ganada', $delta($c['avg_ticket'], $p['avg_ticket']), '#16a34a'],
        ['Nuevas oportunidades', (string) $c['new_opps'], 'creadas en el periodo', $delta($c['new_opps'], $p['new_opps']), '#c026d3'],
    ];
@endphp
<div class="card">
    <div class="ch"><span class="t">Indicadores clave</span><div class="s">Variación frente al periodo anterior de la misma duración.</div></div>
    <table><tr>
        @foreach ($big as [$l, $v, $sub, $d])
            <td class="kpi" style="vertical-align:top">
                <div class="big">
                    <div class="l">{{ $l }}</div>
                    <div class="v">{{ $v }}</div>
                    <div class="d">@if ($d !== null)<span style="color:{{ $d >= 0 ? '#86efac' : '#fda4af' }};font-weight:bold">{{ $d >= 0 ? '▲' : '▼' }} {{ number_format(abs($d), 1) }}%</span> @endif{{ $sub }}</div>
                </div>
            </td>
        @endforeach
    </tr><tr>
        @foreach ($small as [$l, $v, $sub, $d, $col])
            <td class="kpi" style="vertical-align:top">
                <div class="kb">
                    <div class="acc" style="background:{{ $col }};width:22px"></div>
                    <div class="l">{{ $l }}</div>
                    <div class="v">{{ $v }}</div>
                    <div class="d">@if ($d !== null)<span class="{{ $d >= 0 ? 'up' : 'down' }}">{{ $d >= 0 ? '▲' : '▼' }} {{ number_format(abs($d), 1) }}%</span> @endif{{ $sub }}</div>
                </div>
            </td>
        @endforeach
    </tr></table>
</div>
@endif

{{-- ============ COTIZADO VS GANADO ============ --}}
@if ($has('trend'))
@php
    $trendImg = \App\Support\ReportCharts::bars(
        collect($series)->map(fn ($s) => $label($s['date']))->all(),
        [
            ['name' => 'Cotizado', 'color' => '#8b5cf6', 'values' => collect($series)->pluck('quoted')->all()],
            ['name' => 'Ganado', 'color' => '#16a34a', 'values' => collect($series)->pluck('won')->all()],
        ],
    );
    $hasTrend = collect($series)->sum('quoted') + collect($series)->sum('won') > 0;
@endphp
<div class="card">
    <div class="ch"><span class="t">Cotizado vs. ganado</span><div class="s">Por {{ ['day' => 'día', 'week' => 'semana', 'month' => 'mes'][$bucket] }} · importes en MXN</div></div>
    <div style="font-size:8px;margin-bottom:4px"><span class="dot" style="background:#8b5cf6"></span>Cotizado &nbsp;&nbsp;<span class="dot" style="background:#16a34a"></span>Ganado</div>
    @if ($hasTrend && $trendImg)
        <img src="{{ $trendImg }}" style="width:100%">
    @else
        <p class="muted">Sin datos en este periodo.</p>
    @endif
</div>
@endif

{{-- ============ EMBUDO ============ --}}
@if ($has('funnel'))
@php $fMax = max(1, collect($funnel)->max('count')); @endphp
<div class="card">
    <div class="ch"><span class="t">Embudo de oportunidades</span><div class="s">Oportunidades creadas en el periodo, por etapa actual.</div></div>
    <table>
        @foreach ($funnel as $f)
            <tr>
                <td style="width:125px;padding:4px 0;white-space:nowrap"><span class="dot" style="background:{{ $stageColor[$f['stage']] }}"></span>{{ $f['label'] }}</td>
                <td style="padding:4px 8px"><div class="track"><div class="fill" style="width:{{ max($f['count'] ? 3 : 0, round($f['count'] / $fMax * 100)) }}%;background:{{ $stageColor[$f['stage']] }}"></div></div></td>
                <td class="r" style="width:110px;padding:4px 0"><b>{{ $f['count'] }}</b> <span class="muted">· {{ $short($f['amount']) }}</span></td>
            </tr>
        @endforeach
    </table>
</div>
@endif

{{-- ============ GANADAS VS PERDIDAS ============ --}}
@if ($has('outcome'))
@php
    $tot = $outcome['won']['count'] + $outcome['lost']['count'];
    $outImg = \App\Support\ReportCharts::donut([
        ['value' => $outcome['won']['count'], 'color' => '#16a34a'],
        ['value' => $outcome['lost']['count'], 'color' => '#e11d48'],
    ], $pct($c['win_rate']), 'cierre');
@endphp
<div class="card">
    <div class="ch"><span class="t">Ganadas vs. perdidas</span><div class="s">Oportunidades cerradas en el periodo.</div></div>
    @if ($tot > 0)
        <table><tr>
            <td style="width:170px;vertical-align:middle">@if ($outImg)<img src="{{ $outImg }}" style="width:160px">@endif</td>
            <td style="vertical-align:middle">
                <table>
                    <tr><td style="padding:5px 0;border-bottom:1px solid #f0ecf8"><span class="dot" style="background:#16a34a"></span><b>Ganadas</b></td><td class="r" style="padding:5px 0;border-bottom:1px solid #f0ecf8"><b style="font-size:13px;color:#15803d">{{ $outcome['won']['count'] }}</b> &nbsp;<span class="muted">{{ $money($outcome['won']['amount']) }}</span></td></tr>
                    <tr><td style="padding:5px 0;border-bottom:1px solid #f0ecf8"><span class="dot" style="background:#e11d48"></span><b>Perdidas</b></td><td class="r" style="padding:5px 0;border-bottom:1px solid #f0ecf8"><b style="font-size:13px;color:#be123c">{{ $outcome['lost']['count'] }}</b> &nbsp;<span class="muted">{{ $money($outcome['lost']['amount']) }}</span></td></tr>
                </table>
                @if (count($lostReasons))
                    <div style="margin-top:8px"><span class="muted" style="font-size:8px">Motivos de pérdida</span><br>
                        @foreach ($lostReasons as $r)<span class="tag red">{{ \Illuminate\Support\Str::limit($r['reason'], 28) }} · {{ $r['count'] }}</span>@endforeach
                    </div>
                @endif
            </td>
        </tr></table>
    @else
        <p class="muted">Sin oportunidades cerradas en este periodo.</p>
    @endif
</div>
@endif

{{-- ============ MARGEN Y VOLUMEN ============ --}}
@if ($has('margin'))
@php
    $mImg = collect($series)->sum('quotes') > 0 ? \App\Support\ReportCharts::combo(
        collect($series)->map(fn ($s) => $label($s['date']))->all(),
        collect($series)->pluck('quotes')->map(fn ($v) => (float) $v)->all(),
        collect($series)->pluck('margin')->all(),
        '#c4b5fd', '#d97706',
    ) : null;
@endphp
<div class="card">
    <div class="ch"><span class="t">Margen y volumen de cotizaciones</span><div class="s">Cotizaciones emitidas (barras) y margen % (línea).</div></div>
    @if ($mImg)
        <div style="font-size:8px;margin-bottom:4px"><span class="dot" style="background:#c4b5fd"></span>Cotizaciones &nbsp;&nbsp;<span class="dot" style="background:#d97706"></span>Margen %</div>
        <img src="{{ $mImg }}" style="width:100%">
    @else
        <p class="muted">Sin cotizaciones en este periodo.</p>
    @endif
</div>
@endif

{{-- ============ MONEDAS ============ --}}
@if ($has('currencies'))
@php
    $cTot = max(1, collect($currencies)->sum('amount'));
    $curImg = \App\Support\ReportCharts::donut(
        collect($currencies)->map(fn ($cu, $i) => ['value' => $cu['amount'], 'color' => $palette[$i % 5]])->all(),
        $short($cTot), 'cotizado',
    );
@endphp
<div class="card">
    <div class="ch"><span class="t">Cotizado por moneda</span><div class="s">Equivalente en MXN.</div></div>
    @if (count($currencies))
        <table><tr>
            <td style="width:170px;vertical-align:middle">@if ($curImg)<img src="{{ $curImg }}" style="width:160px">@endif</td>
            <td style="vertical-align:middle">
                <table>
                    @foreach ($currencies as $i => $cu)
                        <tr>
                            <td style="padding:6px 0;border-bottom:1px solid #f0ecf8"><span class="dot" style="background:{{ $palette[$i % 5] }}"></span><b>{{ $cu['currency'] }}</b></td>
                            <td class="r" style="padding:6px 0;border-bottom:1px solid #f0ecf8">{{ $cu['quotes'] }} cotiz. · <b>{{ $money($cu['amount']) }}</b> <span class="muted">({{ round($cu['amount'] / $cTot * 100) }}%)</span></td>
                        </tr>
                    @endforeach
                </table>
            </td>
        </tr></table>
    @else
        <p class="muted">Sin cotizaciones en este periodo.</p>
    @endif
</div>
@endif

{{-- ============ CLIENTES ============ --}}
@if ($has('clients'))
@php $clMax = max(1, collect($topClients)->max('amount')); @endphp
<div class="card">
    <div class="ch"><span class="t">Principales clientes</span><div class="s">Por monto cotizado en el periodo.</div></div>
    @if (count($topClients))
        <table>
            @foreach ($topClients as $i => $t)
                <tr>
                    <td style="width:20px;padding:4px 0"><span class="badge" style="background:#4c1d95">{{ $i + 1 }}</span></td>
                    <td style="width:200px;padding:4px 4px;white-space:nowrap">{{ \Illuminate\Support\Str::limit($t['name'], 34) }}</td>
                    <td style="padding:4px 8px"><div class="track"><div class="fill" style="width:{{ max(3, round($t['amount'] / $clMax * 100)) }}%;background:#6d28d9"></div></div></td>
                    <td class="r" style="width:120px;padding:4px 0"><b>{{ $money($t['amount']) }}</b> <span class="muted">· {{ $t['quotes'] }}</span></td>
                </tr>
            @endforeach
        </table>
    @else
        <p class="muted">Sin cotizaciones en este periodo.</p>
    @endif
</div>
@endif

{{-- ============ PRONÓSTICO ============ --}}
@if ($has('forecast'))
@php
    $fImg = collect($forecast['months'])->sum('amount') > 0 ? \App\Support\ReportCharts::bars(
        collect($forecast['months'])->map(fn ($m) => $months[(int) \Carbon\Carbon::parse($m['month'])->format('n')].' '.\Carbon\Carbon::parse($m['month'])->format('y'))->all(),
        [
            ['name' => 'Pipeline', 'color' => '#c4b5fd', 'values' => collect($forecast['months'])->pluck('amount')->all()],
            ['name' => 'Ponderado', 'color' => '#6d28d9', 'values' => collect($forecast['months'])->pluck('weighted')->all()],
        ],
        420,
    ) : null;
@endphp
<div class="card">
    <div class="ch"><span class="t">Pronóstico de cierre</span><div class="s">Pipeline abierto por mes esperado de cierre.</div></div>
    @if ($fImg)
        <div style="font-size:8px;margin-bottom:4px"><span class="dot" style="background:#c4b5fd"></span>Pipeline &nbsp;&nbsp;<span class="dot" style="background:#6d28d9"></span>Ponderado por etapa</div>
        <img src="{{ $fImg }}" style="width:100%">
    @else
        <p class="muted">Sin oportunidades abiertas con fecha de cierre en los próximos 6 meses.</p>
    @endif
    @if ($forecast['overdue']['count'] || $forecast['undated']['count'])
        <div style="margin-top:8px">
            @if ($forecast['overdue']['count'])<span class="tag red">{{ $forecast['overdue']['count'] }} vencidas · {{ $money($forecast['overdue']['amount']) }}</span>@endif
            @if ($forecast['undated']['count'])<span class="tag">{{ $forecast['undated']['count'] }} sin fecha · {{ $money($forecast['undated']['amount']) }}</span>@endif
        </div>
    @endif
</div>
@endif

{{-- ============ OPORTUNIDADES ABIERTAS ============ --}}
@if ($has('open'))
<div class="card">
    <div class="ch"><span class="t">Oportunidades abiertas de mayor valor</span><div class="s">Las más grandes del pipeline actual.</div></div>
    @if (count($topOpen))
        <table class="t">
            <tr><th>Oportunidad</th><th style="width:90px">Etapa</th><th style="width:75px">Cierre</th><th class="r" style="text-align:right;width:80px">Monto</th></tr>
            @foreach ($topOpen as $i => $o)
                <tr class="{{ $i % 2 ? 'z' : '' }}">
                    <td><b>{{ \Illuminate\Support\Str::limit($o['name'], 34) }}</b><br><span class="muted" style="font-size:7.5px">{{ $o['client'] ?? 'Sin cliente' }}@if ($o['owner']) · {{ $o['owner'] }}@endif</span></td>
                    <td><span class="badge" style="background:{{ $stageColor[$o['stage']] ?? '#888' }}">{{ $o['stage_label'] }}</span></td>
                    <td>{{ $o['expected_close_date'] ? $dmy($o['expected_close_date']) : '—' }}</td>
                    <td class="r"><b>{{ $money($o['amount']) }}</b></td>
                </tr>
            @endforeach
        </table>
    @else
        <p class="muted">Sin oportunidades abiertas.</p>
    @endif
</div>
@endif

{{-- ============ VENDEDORES ============ --}}
@if ($has('sellers') && $sellers !== null)
<div class="card">
    <div class="ch"><span class="t">Desempeño por vendedor</span><div class="s">Cotizado, ganado y tasa de cierre en el periodo.</div></div>
    @if (count($sellers))
        <table class="t">
            <tr><th style="width:20px">#</th><th>Vendedor</th><th class="r" style="text-align:right">Cotiz.</th><th class="r" style="text-align:right">Cotizado</th><th class="r" style="text-align:right">Ganado</th><th class="r" style="text-align:right">Cierre</th></tr>
            @foreach ($sellers as $i => $s)
                <tr class="{{ $i % 2 ? 'z' : '' }}">
                    <td><span class="badge" style="background:{{ $i === 0 ? '#d97706' : '#8a7fa8' }}">{{ $i + 1 }}</span></td>
                    <td><b>{{ $s['name'] }}</b></td>
                    <td class="r">{{ $s['quotes'] }}</td>
                    <td class="r">{{ $money($s['quoted']) }}</td>
                    <td class="r"><b style="color:#15803d">{{ $money($s['won']) }}</b> <span class="muted">({{ $s['won_count'] }})</span></td>
                    <td class="r">{{ $pct($s['win_rate']) }}</td>
                </tr>
            @endforeach
        </table>
    @else
        <p class="muted">Sin actividad en este periodo.</p>
    @endif
</div>
@endif

</body>
</html>
