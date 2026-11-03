<?php

namespace App\Services;

use App\Models\Quote;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;

/** Genera los PDFs de una cotización: interno (calculadora) y de cliente (MXN/USD). */
class QuotePdfService
{
    public const TYPES = ['internal', 'client_mxn', 'client_usd'];

    public function __construct(private QuoteCalculator $calculator) {}

    public function make(Quote $quote, string $type): DomPdf
    {
        $quote->loadMissing('items', 'seller');

        if ($type === 'internal') {
            return Pdf::loadView('pdf.quote', ['quote' => $quote, 'fx' => $quote->exchange_rate])
                ->setPaper('a4', 'landscape');
        }

        $mode = $type === 'client_usd' ? 'usd' : 'mxn';

        return Pdf::loadView('pdf.quote-client', $this->clientData($quote, $mode))
            ->setPaper('a4', 'portrait');
    }

    public function filename(Quote $quote, string $type): string
    {
        return $quote->number.'-'.$type.'.pdf';
    }

    /**
     * Prepara los montos del PDF cliente en la divisa de salida (§9.2).
     *
     * @return array<string, mixed>
     */
    public function clientData(Quote $quote, string $mode): array
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
