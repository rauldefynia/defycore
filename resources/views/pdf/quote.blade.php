@php
    use App\Support\Money;
    $cur = $quote->currency;
    $fx = $quote->exchange_rate ?: 1;
    $pages = [['cur' => $cur, 'mxn' => false]];
    if ($quote->show_mxn_equivalent && $cur !== 'MXN') {
        $pages[] = ['cur' => 'MXN', 'mxn' => true];
    }
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{{ $quote->number }} - Calculadora</title>
<style>
    @page { margin: 22px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #222; }
    h1 { font-size: 15px; margin: 0 0 2px; }
    .meta { margin-bottom: 8px; color: #555; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 3px 4px; }
    th { background: #efeaf8; text-align: center; }
    th.group { background: #d9cdf5; }
    td.n { text-align: right; white-space: nowrap; }
    .totals { width: 260px; margin-left: auto; margin-top: 8px; }
    .totals td { border: none; border-bottom: 1px solid #ddd; font-size: 10px; }
    .totals tr.total td { font-weight: bold; font-size: 12px; border-top: 2px solid #333; }
    .break { page-break-before: always; }
</style>
</head>
<body>
@foreach ($pages as $idx => $pg)
    @php
        $m = $pg['mxn'];
        $c = $pg['cur'];
        $k = $m ? $fx : 1;
        $f = fn ($v) => Money::format(($v ?? 0) * $k, $c);
        $p = fn ($v) => number_format((float) $v, 2).'%';
    @endphp
    <div class="{{ $idx > 0 ? 'break' : '' }}">
        <h1>Calculadora · {{ $quote->number }} — {{ $quote->name }}</h1>
        <div class="meta">
            Vendedor: {{ $quote->seller?->name }} · Fecha: {{ $quote->date?->format('d/m/Y') }}
            · Cliente: {{ $quote->client_data['name'] ?? '—' }} · Moneda: {{ $c }}
            @if ($m) · Tipo de cambio aplicado: 1 {{ $cur }} = {{ number_format($fx, 4) }} MXN @endif
        </div>
        <table>
            <thead>
                <tr>
                    <th colspan="4" class="group">Identificación</th>
                    <th colspan="4" class="group">Costo</th>
                    <th colspan="5" class="group">Precio de venta</th>
                    <th colspan="2" class="group">Utilidad</th>
                    <th class="group">Margen</th>
                </tr>
                <tr>
                    <th>#</th><th>Cant.</th><th>SKU</th><th>Descripción</th>
                    <th>Unit. s/desc.</th><th>% desc.</th><th>Unit. c/desc.</th><th>Total</th>
                    <th>Unit. s/desc.</th><th>% gan.</th><th>% desc. cli.</th><th>Unit. c/desc.</th><th>Total</th>
                    <th>Unitaria</th><th>Total</th>
                    <th>%</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($quote->items as $it)
                    <tr>
                        <td class="n">{{ $it->item_number }}</td>
                        <td class="n">{{ rtrim(rtrim(number_format($it->quantity, 2), '0'), '.') }}</td>
                        <td>{{ $it->sku }}</td>
                        <td>{{ $it->description }}</td>
                        <td class="n">{{ $f($it->cost_unit_without_discount) }}</td>
                        <td class="n">{{ $p($it->discount_percent) }}</td>
                        <td class="n">{{ $f($it->cost_unit) }}</td>
                        <td class="n">{{ $f($it->cost_total) }}</td>
                        <td class="n">{{ $f($it->sale_unit_price_without_client_discount) }}</td>
                        <td class="n">{{ $p($it->target_margin_percent) }}</td>
                        <td class="n">{{ $p($it->client_discount_percent) }}</td>
                        <td class="n">{{ $f($it->sale_unit_price) }}</td>
                        <td class="n">{{ $f($it->sale_total_price) }}</td>
                        <td class="n">{{ $f($it->unit_profit) }}</td>
                        <td class="n">{{ $f($it->line_profit) }}</td>
                        <td class="n">{{ $p($it->line_margin_percent) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
        <table class="totals">
            <tr><td>Subtotal</td><td class="n">{{ $m ? Money::format($quote->subtotal_mxn ?? $quote->subtotal * $fx, 'MXN') : $f($quote->subtotal) }}</td></tr>
            <tr><td>IVA 16%</td><td class="n">{{ $m ? Money::format($quote->tax_amount_mxn ?? $quote->tax_amount * $fx, 'MXN') : $f($quote->tax_amount) }}</td></tr>
            <tr class="total"><td>TOTAL</td><td class="n">{{ $m ? Money::format($quote->total_mxn_equivalent ?? $quote->total * $fx, 'MXN') : $f($quote->total) }}</td></tr>
        </table>
    </div>
@endforeach
</body>
</html>
