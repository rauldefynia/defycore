<?php

namespace App\Services;

use Illuminate\Support\Carbon;

/**
 * Motor de cálculo del cotizador (ver cotizaciones-logica-negocio.md §4-§8).
 *
 * El margen es sobre el precio de venta: precio = costo / (1 - margen).
 * El IVA (16%) es fijo y el descuento general se aplica DESPUÉS del IVA.
 * Los totales suman valores crudos por partida y se redondean sólo al final.
 * El calendario de pagos usa la variante "saldo corriente" (§7.3 C).
 */
class QuoteCalculator
{
    public const TAX_RATE = 0.16;

    public const CURRENCIES = ['MXN', 'USD', 'EUR', 'CAD', 'GBP', 'JPY', 'CHF', 'AUD', 'CNY', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'GTQ'];

    public const ZERO_DECIMAL = ['JPY', 'CNY', 'ARS', 'CLP', 'COP'];

    public static function decimals(string $currency): int
    {
        return in_array($currency, self::ZERO_DECIMAL, true) ? 0 : 2;
    }

    /**
     * Cálculo de una partida a partir de sus entradas crudas (sin redondear).
     *
     * @param  array<string, mixed>  $item
     * @return array<string, float>
     */
    public function item(array $item): array
    {
        $qty = max((float) ($item['quantity'] ?? 1), 1);
        $cusd = max((float) ($item['cost_unit_without_discount'] ?? 0), 0);
        $dp = min(max((float) ($item['discount_percent'] ?? 0), 0), 100);
        $tm = min(max((float) ($item['target_margin_percent'] ?? 0), 0), 99.99);
        $cdp = min(max((float) ($item['client_discount_percent'] ?? 0), 0), 100);

        $discountAmount = $cusd * ($dp / 100);
        $costUnit = max($cusd - $discountAmount, 0);
        $costTotal = $costUnit * $qty;

        $marginDecimal = $tm / 100;
        $saleUnitNoDisc = ($costUnit > 0 && $marginDecimal < 1)
            ? $costUnit / (1 - $marginDecimal)
            : 0.0;

        $clientDiscountAmount = $saleUnitNoDisc * ($cdp / 100);
        $saleUnit = max($saleUnitNoDisc - $clientDiscountAmount, 0);
        $saleTotal = $saleUnit * $qty;

        $unitProfit = $saleUnit - $costUnit;
        $lineProfit = $saleTotal - $costTotal;

        return [
            'quantity' => $qty,
            'discount_amount' => $discountAmount,
            'cost_unit' => $costUnit,
            'cost_total' => $costTotal,
            'sale_unit_price_without_client_discount' => $saleUnitNoDisc,
            'client_discount_amount' => $clientDiscountAmount,
            'sale_unit_price' => $saleUnit,
            'sale_total_price' => $saleTotal,
            'unit_profit' => $unitProfit,
            'unit_margin_percent' => $saleUnit > 0 ? ($unitProfit / $saleUnit) * 100 : 0.0,
            'line_profit' => $lineProfit,
            'line_margin_percent' => $saleTotal > 0 ? ($lineProfit / $saleTotal) * 100 : 0.0,
        ];
    }

    /**
     * Calcula toda la cotización.
     *
     * @param  array<string, mixed>  $quote  Campos de cabecera (moneda, descuento general, plan de pagos)
     * @param  array<int, array<string, mixed>>  $items
     * @return array{quote: array<string, mixed>, items: array<int, array<string, mixed>>}
     */
    public function calculate(array $quote, array $items): array
    {
        $currency = $quote['currency'] ?? 'MXN';
        $dec = self::decimals($currency);
        $fx = $currency === 'MXN' ? 1.0 : max((float) ($quote['exchange_rate'] ?? 1), 0.000001);
        $showMxn = $currency !== 'MXN' && ! empty($quote['show_mxn_equivalent']);

        $sumCost = $sumSale = $sumProfit = 0.0;
        $productsCost = 0.0;
        $outItems = [];

        foreach (array_values($items) as $i => $raw) {
            $c = $this->item($raw);
            $sumCost += $c['cost_total'];
            $sumSale += $c['sale_total_price'];
            $sumProfit += $c['line_profit'];
            if (($raw['item_type'] ?? 'producto') === 'producto') {
                $productsCost += $c['cost_total'];
            }

            $outItems[] = [
                'item_number' => $i + 1,
                'item_type' => $raw['item_type'] ?? 'producto',
                'description' => $raw['description'] ?? '',
                'detail' => $raw['detail'] ?? null,
                'sku' => $raw['sku'] ?? null,
                'quantity' => $c['quantity'],
                'cost_unit_without_discount' => max((float) ($raw['cost_unit_without_discount'] ?? 0), 0),
                'discount_percent' => min(max((float) ($raw['discount_percent'] ?? 0), 0), 100),
                'discount_amount' => round($c['discount_amount'], 4),
                'cost_unit' => round($c['cost_unit'], 4),
                'cost_total' => round($c['cost_total'], $dec),
                'target_margin_percent' => min(max((float) ($raw['target_margin_percent'] ?? 0), 0), 99.99),
                'sale_unit_price_without_client_discount' => round($c['sale_unit_price_without_client_discount'], 4),
                'client_discount_percent' => min(max((float) ($raw['client_discount_percent'] ?? 0), 0), 100),
                'client_discount_amount' => round($c['client_discount_amount'], 4),
                'sale_unit_price' => round($c['sale_unit_price'], 4),
                'sale_total_price' => round($c['sale_total_price'], $dec),
                'unit_profit' => round($c['unit_profit'], 4),
                'unit_margin_percent' => round($c['unit_margin_percent'], 2),
                'line_profit' => round($c['line_profit'], $dec),
                'line_margin_percent' => round($c['line_margin_percent'], 2),
                'cost_total_mxn' => $showMxn ? round($c['cost_total'] * $fx, 2) : null,
                'sale_total_price_mxn' => $showMxn ? round($c['sale_total_price'] * $fx, 2) : null,
                'line_profit_mxn' => $showMxn ? round($c['line_profit'] * $fx, 2) : null,
            ];
        }

        // Totales (§5)
        $subtotal = $sumSale;
        $tax = $subtotal * self::TAX_RATE;
        $totalBefore = $subtotal + $tax;

        $discType = ($quote['global_discount_type'] ?? 'percentage') === 'fixed' ? 'fixed' : 'percentage';
        $discValue = max((float) ($quote['global_discount_value'] ?? 0), 0);
        $discAmount = $discType === 'fixed'
            ? min($discValue, $totalBefore)
            : $totalBefore * (min($discValue, 100) / 100);
        $discAmount = max(min($discAmount, $totalBefore), 0);

        $total = $totalBefore - $discAmount;
        $profitFinal = $sumProfit - $discAmount;
        $marginPct = $sumSale > 0 ? ($profitFinal / $sumSale) * 100 : 0.0;

        $subtotalR = round($subtotal, $dec);
        $taxR = round($tax, $dec);
        $discR = round($discAmount, $dec);
        // Total coherente con lo impreso: subtotal + IVA - descuento.
        $totalR = round($total, $dec);

        $out = [
            'currency' => $currency,
            'exchange_rate' => round($fx, 6),
            'show_mxn_equivalent' => $showMxn,
            'summary_cost' => round($sumCost, $dec),
            'summary_sale_total' => $subtotalR,
            'summary_profit' => round($sumProfit, $dec),
            'summary_margin_percent' => round($marginPct, 2),
            'subtotal' => $subtotalR,
            'tax_amount' => $taxR,
            'global_discount_type' => $discType,
            'global_discount_value' => $discValue,
            'global_discount_amount' => $discR,
            'total' => $totalR,
            'subtotal_mxn' => $currency !== 'MXN' ? round($subtotal * $fx, 2) : null,
            'tax_amount_mxn' => $currency !== 'MXN' ? round($tax * $fx, 2) : null,
            'total_mxn_equivalent' => $currency !== 'MXN' ? round($total * $fx, 2) : null,
        ];

        // Plan de pagos (§7)
        $hasPlan = ! empty($quote['has_payment_plan']);
        $out['has_payment_plan'] = $hasPlan;
        $out['first_payment_type'] = null;
        $out['first_payment_value'] = null;
        $out['first_payment_date'] = null;
        $out['payment_months'] = null;
        $out['first_payment_amount'] = null;
        $out['remaining_amount'] = null;
        $out['monthly_payment_amount'] = null;
        $out['payment_schedule'] = null;
        $out['payment_terms'] = null;
        $out['down_payment_warning'] = false;

        if ($hasPlan) {
            $fpType = ($quote['first_payment_type'] ?? 'percentage') === 'fixed' ? 'fixed' : 'percentage';
            $fpValue = max((float) ($quote['first_payment_value'] ?? 0), 0);
            $months = min(max((int) ($quote['payment_months'] ?? 1), 1), 120);

            $first = $fpType === 'fixed'
                ? min($fpValue, $total)
                : $total * (min($fpValue, 100) / 100);
            $first = max(min($first, $total), 0);
            $remaining = max($total - $first, 0);
            $monthly = $remaining / $months;

            $out['first_payment_type'] = $fpType;
            $out['first_payment_value'] = $fpValue;
            $out['first_payment_date'] = $quote['first_payment_date'] ?? null;
            $out['payment_months'] = $months;
            $out['first_payment_amount'] = round($first, $dec);
            $out['remaining_amount'] = round($remaining, $dec);
            $out['monthly_payment_amount'] = round($monthly, $dec);
            $out['payment_terms'] = $quote['payment_terms'] ?? null;
            $out['payment_schedule'] = $this->schedule(
                $totalR, round($first, $dec), $months, $out['first_payment_date'], $dec
            );
            $out['down_payment_warning'] = $productsCost > 0 && $first < $productsCost;
        }

        return ['quote' => $out, 'items' => $outItems];
    }

    /**
     * Calendario por saldo corriente (§7.3 C): la última cuota es el saldo restante exacto.
     *
     * @return array<int, array{label: string, date: string|null, amount: float, balance: float}>
     */
    public function schedule(float $total, float $first, int $months, ?string $startDate, int $dec = 2): array
    {
        $rows = [];
        $balance = $total;
        $hasDown = $first > 0.005;
        $start = $startDate ? Carbon::parse($startDate) : null;

        if ($hasDown) {
            $balance = round($balance - $first, $dec);
            $rows[] = [
                'label' => 'Anticipo',
                'date' => $start?->toDateString(),
                'amount' => $first,
                'balance' => $balance,
            ];
        }

        $remaining = $balance;
        for ($i = 1; $i <= $months; $i++) {
            $pay = $i < $months ? round($remaining / $months, $dec) : $balance;
            $balance = round($balance - $pay, $dec);
            $offset = $hasDown ? $i : $i - 1;
            $rows[] = [
                'label' => 'Mes '.$i,
                'date' => $start?->copy()->addMonthsNoOverflow($offset)->toDateString(),
                'amount' => $pay,
                'balance' => $balance,
            ];
        }

        return $rows;
    }
}
