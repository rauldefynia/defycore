<?php

namespace App\Support;

use App\Services\QuoteCalculator;

class Money
{
    private const SYMBOLS = [
        'MXN' => '$', 'USD' => 'US$', 'EUR' => '€', 'CAD' => 'CA$', 'GBP' => '£', 'JPY' => '¥',
        'CHF' => 'Fr.', 'AUD' => 'A$', 'CNY' => '¥', 'BRL' => 'R$', 'ARS' => '$', 'CLP' => '$',
        'COP' => '$', 'PEN' => 'S/', 'GTQ' => 'Q',
    ];

    public static function symbol(string $currency): string
    {
        return self::SYMBOLS[$currency] ?? $currency;
    }

    /** Número con separadores propios de la divisa (§6). */
    public static function number(float|int|null $value, string $currency = 'MXN'): string
    {
        $dec = QuoteCalculator::decimals($currency);

        [$decSep, $thSep] = match (true) {
            in_array($currency, ['EUR', 'CHF', 'ARS', 'CLP', 'COP'], true) => [',', '.'],
            default => ['.', ','],
        };

        return number_format((float) $value, $dec, $decSep, $thSep);
    }

    public static function format(float|int|null $value, string $currency = 'MXN'): string
    {
        return self::symbol($currency).self::number($value, $currency);
    }
}
