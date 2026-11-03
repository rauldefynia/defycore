@php
    use App\Support\Money;
    $fx = $quote->exchange_rate ?: 1;
    $client = $quote->client_data ?? [];
    $hasSku = $quote->items->contains(fn ($i) => filled($i->sku));
    $hasDisc = $quote->items->contains(fn ($i) => $i->client_discount_percent > 0);
    $m = fn ($v) => Money::format($v, $currency);
    $unit = fn ($i) => $useMxnFields ? $i->sale_unit_price * $fx : $i->sale_unit_price * $factor;
    $line = fn ($i) => $useMxnFields ? ($i->sale_total_price_mxn ?? $i->sale_total_price * $fx) : $i->sale_total_price * $factor;
    $addr = fn ($d) => collect([$d['address'] ?? null, $d['zip'] ?? null, $d['city'] ?? null, $d['state'] ?? null, $d['country'] ?? null])->filter()->implode(', ');
    $personalized = $quote->delivery_unit === 'personalizado';
    $unitLabel = ['dias' => 'días', 'semanas' => 'semanas', 'meses' => 'meses'][$quote->delivery_unit] ?? 'días';
    $first = $schedule ? collect($schedule)->firstWhere('label', 'Anticipo') : null;
    $nextPay = $schedule ? collect($schedule)->firstWhere(fn ($r) => str_starts_with($r['label'], 'Mes')) : null;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{{ $quote->number }}</title>
<style>
    @page { margin: 60px 40px 55px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #222; }
    h1 { font-size: 20px; margin: 0; color: #5b3fb0; }
    h3 { font-size: 11px; margin: 0 0 4px; color: #5b3fb0; text-transform: uppercase; }
    .head td { vertical-align: top; }
    .box { border: 1px solid #ddd; padding: 8px; }
    .bar { background: #f3effb; padding: 6px 8px; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; }
    table.items th { background: #5b3fb0; color: #fff; padding: 5px; text-align: left; }
    table.items td { border-bottom: 1px solid #e3e3e3; padding: 5px; vertical-align: top; }
    .r { text-align: right; white-space: nowrap; }
    .detail { color: #666; font-size: 9px; }
    .totals { width: 290px; margin-left: auto; margin-top: 10px; }
    .totals td { padding: 3px 5px; border-bottom: 1px solid #eee; }
    .totals tr.total td { font-weight: bold; font-size: 13px; border-top: 2px solid #5b3fb0; }
    .terms { font-size: 8.5px; color: #444; }
    .terms li { margin-bottom: 3px; }
    .sign td { width: 50%; padding-top: 50px; text-align: center; }
    .sign .line { border-top: 1px solid #333; margin: 0 20px; padding-top: 4px; }
    .cards td { width: 50%; padding: 6px; background: #f3effb; }
    #foot { position: fixed; bottom: -35px; left: 0; right: 0; font-size: 8px; color: #777; text-align: center; border-top: 1px solid #ddd; padding-top: 4px; }
    .nobreak { page-break-inside: avoid; }
</style>
</head>
<body>
<div id="foot">
    {{ $issuer['name'] }} @if($issuer['phone']) · {{ $issuer['phone'] }} @endif @if($issuer['email']) · {{ $issuer['email'] }} @endif
    · Folio {{ $quote->number }}
</div>
<script type="text/php">
    $pdf->page_script('
        $font = $fontMetrics->get_font("DejaVu Sans", "normal");
        $pdf->text(470, $pdf->get_height() - 22, "Página $PAGE_NUM de $PAGE_COUNT", $font, 8, [0.45, 0.45, 0.45]);
    ');
</script>

<table class="head">
    <tr>
        <td><h1>Cotización</h1><div>{{ $quote->name }}</div></td>
        <td class="r"><strong>{{ $quote->number }}</strong><br>Moneda: {{ $currency }}</td>
    </tr>
</table>

<table style="margin-top:10px"><tr>
    <td style="width:49%;vertical-align:top" class="box">
        <h3>Cliente</h3>
        @if ($client)
            <strong>{{ $client['name'] ?? '' }}</strong><br>
            @if (!empty($client['rfc'])) RFC: {{ $client['rfc'] }}<br> @endif
            {{ $addr($client) }}
            @if (!empty($client['contact'])) <br>Contacto: {{ $client['contact'] }} @endif
            @if (!empty($client['phone']) || !empty($client['email'])) <br>{{ $client['phone'] ?? '' }} {{ $client['email'] ?? '' }} @endif
        @else
            Sin datos de cliente registrados
        @endif
    </td>
    <td style="width:2%"></td>
    <td style="width:49%;vertical-align:top" class="box">
        <h3>Proveedor</h3>
        <strong>{{ $issuer['name'] }}</strong><br>
        @if ($issuer['rfc']) RFC: {{ $issuer['rfc'] }}<br> @endif
        {{ $addr($issuer) }}
        @if ($issuer['phone'] || $issuer['email']) <br>{{ $issuer['phone'] }} {{ $issuer['email'] }} @endif
        @if ($issuer['website']) <br>{{ $issuer['website'] }} @endif
    </td>
</tr></table>

<div class="bar">
    <strong>Folio:</strong> {{ $quote->number }} &nbsp;·&nbsp;
    <strong>Fecha:</strong> {{ $quote->date?->format('d/m/Y') }} &nbsp;·&nbsp;
    <strong>Vigencia:</strong> {{ $quote->due_date?->format('d/m/Y') ?? '—' }} &nbsp;·&nbsp;
    <strong>Ejecutivo:</strong> {{ $quote->seller?->name }} &nbsp;·&nbsp;
    <strong>Moneda:</strong> {{ $currency }}
</div>

<table class="items">
    <thead><tr>
        <th>N°</th><th>Cant.</th>
        @if ($hasSku)<th>SKU</th>@endif
        <th>Descripción</th>
        <th class="r">Precio unit. sin IVA</th>
        @if ($hasDisc)<th class="r">% Desc.</th>@endif
        <th class="r">Importe sin IVA</th>
    </tr></thead>
    <tbody>
    @foreach ($quote->items as $it)
        <tr>
            <td>{{ $it->item_number }}</td>
            <td>{{ rtrim(rtrim(number_format($it->quantity, 2), '0'), '.') }}</td>
            @if ($hasSku)<td>{{ $it->sku }}</td>@endif
            <td>{{ $it->description }}@if ($it->detail)<div class="detail">{!! nl2br(e($it->detail)) !!}</div>@endif</td>
            <td class="r">{{ $m($unit($it)) }}</td>
            @if ($hasDisc)<td class="r">{{ $it->client_discount_percent > 0 ? number_format($it->client_discount_percent, 2).'%' : '' }}</td>@endif
            <td class="r">{{ $m($line($it)) }}</td>
        </tr>
    @endforeach
    </tbody>
</table>

<table class="totals nobreak">
    <tr><td>Subtotal</td><td class="r">{{ $m($subtotal) }}</td></tr>
    <tr><td>IVA 16%</td><td class="r">{{ $m($tax) }}</td></tr>
    @if ($hasDiscount)
        <tr><td>Total sin descuento</td><td class="r">{{ $m($totalBefore) }}</td></tr>
        <tr><td>Descuento general ({{ $quote->global_discount_type === 'percentage' ? rtrim(rtrim(number_format($quote->global_discount_value, 2), '0'), '.').'%' : 'cantidad fija' }})</td>
            <td class="r">-{{ $m($discount) }}</td></tr>
    @endif
    <tr class="total"><td>TOTAL</td><td class="r">{{ $m($total) }}</td></tr>
</table>

@if ($schedule)
    <div class="nobreak" style="margin-top:14px">
        <h3>Plan de pagos</h3>
        <table class="cards"><tr>
            <td>Anticipo<br><strong>{{ $first ? $m($first['amount']) : $m(0) }}</strong></td>
            <td>Pago mensual<br><strong>{{ $nextPay ? $m($nextPay['amount']) : $m(0) }}</strong></td>
        </tr></table>
        <table class="items" style="margin-top:6px">
            <thead><tr><th>Concepto</th><th>Fecha</th><th class="r">Pago</th><th class="r">Saldo restante</th></tr></thead>
            <tbody>
            @foreach ($schedule as $row)
                <tr>
                    <td>{{ $row['label'] }}@if ($row['label'] === 'Anticipo' && $total > 0) ({{ number_format($row['amount'] / $total * 100, 1) }}%)@endif</td>
                    <td>{{ $row['date'] ? \Illuminate\Support\Carbon::parse($row['date'])->format('d/m/Y') : '' }}</td>
                    <td class="r">{{ $m($row['amount']) }}</td>
                    <td class="r">{{ $m($row['balance']) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
        <div class="detail">Todos los pagos incluyen IVA (16%).</div>
        @if ($quote->payment_terms)<div style="margin-top:4px">{!! nl2br(e($quote->payment_terms)) !!}</div>@endif
    </div>
@endif

<div class="terms" style="margin-top:14px">
    <h3>Términos y condiciones</h3>
    @if ($personalized)
        {!! nl2br(e($quote->notes)) !!}
    @else
        <ol>
            <li><strong>Moneda y precios.</strong> Los precios están expresados en {{ $currency }} y no incluyen IVA salvo que se indique lo contrario.</li>
            <li><strong>Condiciones de pago.</strong> Anticipo del 100% para iniciar el pedido, salvo que se pacte un plan de pagos.</li>
            <li><strong>Vigencia.</strong> Esta cotización es válida hasta el {{ $quote->due_date?->format('d/m/Y') ?? 'fecha de vencimiento indicada' }}.</li>
            <li><strong>Cancelaciones.</strong> Los pedidos confirmados no son cancelables ni reembolsables una vez adquiridos los productos al proveedor.</li>
            <li><strong>Entrega.</strong> El tiempo de entrega es de {{ $quote->delivery_days_min }} a {{ $quote->delivery_days_max }} {{ $unitLabel }} a partir de la confirmación del pago.</li>
            <li><strong>Garantía.</strong> Los productos cuentan con la garantía del fabricante.</li>
            <li><strong>Límite de responsabilidad.</strong> La responsabilidad del proveedor se limita al monto efectivamente pagado por el producto o servicio.</li>
            <li><strong>Controversias.</strong> Para la interpretación y cumplimiento de esta cotización las partes se someten a los tribunales competentes de Jalisco.</li>
        </ol>
    @endif
</div>

<table class="sign nobreak"><tr>
    <td><div class="line">{{ $client['name'] ?? 'Cliente' }}<br>Acepto la cotización</div></td>
    <td><div class="line">{{ $quote->seller?->name }}<br>Ejecutivo de ventas</div></td>
</tr></table>
</body>
</html>
