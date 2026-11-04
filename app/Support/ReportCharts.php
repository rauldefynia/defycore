<?php

namespace App\Support;

/**
 * Gráficas del PDF dibujadas con GD como imágenes PNG (data URI).
 * El generador de PDF no soporta SVG/canvas y sus alturas CSS no son fiables para barras.
 * Se dibuja al doble de resolución para que se vea nítido al reducirse en la página.
 */
class ReportCharts
{
    private const GRID = [229, 222, 242];

    private const AXIS = [200, 190, 225];

    private const TEXT = [110, 100, 140];

    /**
     * Barras agrupadas.
     *
     * @param  string[]  $labels
     * @param  array<int, array{name: string, color: string, values: float[]}>  $series
     */
    public static function bars(array $labels, array $series, int $height = 460): ?string
    {
        if (! self::available() || $labels === []) {
            return null;
        }

        [$W, $L, $R, $T, $B] = [1400, 140, 24, 26, 70];
        $im = self::canvas($W, $height);
        $plotH = $height - $T - $B;
        $max = max(1, ...array_merge(...array_map(fn ($s) => $s['values'], $series)));
        $top = self::nice($max);

        self::grid($im, $W, $L, $R, $T, $plotH, $top, fn ($v) => self::money($v));

        $n = count($labels);
        $slot = ($W - $L - $R) / $n;
        $k = count($series);
        $barW = (int) min(54, $slot * 0.72 / $k);
        $gap = 5;
        $group = $k * $barW + ($k - 1) * $gap;

        foreach ($series as $j => $s) {
            $col = self::color($im, $s['color']);

            foreach ($s['values'] as $i => $v) {
                $h = (int) round($v / $top * $plotH);
                $x = (int) ($L + $slot * $i + ($slot - $group) / 2 + $j * ($barW + $gap));
                self::bar($im, $x, $T + $plotH, $barW, max($v > 0 ? 4 : 0, $h), $col);
            }
        }

        self::xLabels($im, $labels, $L, $slot, $T + $plotH + 40);

        return self::uri($im);
    }

    /**
     * Barras (eje izquierdo) con una línea (eje derecho en %).
     *
     * @param  string[]  $labels
     * @param  float[]  $bars
     * @param  array<int, float|null>  $line
     */
    public static function combo(array $labels, array $bars, array $line, string $barColor, string $lineColor, int $height = 460): ?string
    {
        if (! self::available() || $labels === []) {
            return null;
        }

        [$W, $L, $R, $T, $B] = [1400, 90, 120, 26, 70];
        $im = self::canvas($W, $height);
        $plotH = $height - $T - $B;
        // Ejes con 4 divisiones enteras: conteo múltiplo de 4 y porcentaje múltiplo de 20
        $top = (float) max(4, (int) (ceil(max($bars) / 4) * 4));
        $topPct = (float) max(20, (int) (ceil(max(array_map(fn ($v) => (float) $v, $line)) / 20) * 20));

        self::grid($im, $W, $L, $R, $T, $plotH, $top, fn ($v) => (string) round($v));

        // Etiquetas del eje derecho (%)
        for ($i = 0; $i <= 4; $i++) {
            self::text($im, 17, $W - $R + 14, (int) ($T + $plotH * (1 - $i / 4)) + 7, self::TEXT, round($topPct * $i / 4).'%');
        }

        $n = count($labels);
        $slot = ($W - $L - $R) / $n;
        $barW = (int) min(54, $slot * 0.6);
        $bc = self::color($im, $barColor);

        foreach ($bars as $i => $v) {
            $h = (int) round($v / $top * $plotH);
            self::bar($im, (int) ($L + $slot * $i + ($slot - $barW) / 2), $T + $plotH, $barW, max($v > 0 ? 4 : 0, $h), $bc);
        }

        $lc = self::color($im, $lineColor);
        imagesetthickness($im, 5);
        $prev = null;

        foreach ($line as $i => $v) {
            if ($v === null) {
                $prev = null;

                continue;
            }

            $x = (int) ($L + $slot * $i + $slot / 2);
            $y = (int) ($T + $plotH * (1 - $v / $topPct));

            if ($prev) {
                imageline($im, $prev[0], $prev[1], $x, $y, $lc);
            }

            $prev = [$x, $y];
        }

        imagesetthickness($im, 1);

        foreach ($line as $i => $v) {
            if ($v !== null) {
                $x = (int) ($L + $slot * $i + $slot / 2);
                $y = (int) ($T + $plotH * (1 - $v / $topPct));
                imagefilledellipse($im, $x, $y, 18, 18, imagecolorallocate($im, 255, 255, 255));
                imagefilledellipse($im, $x, $y, 12, 12, $lc);
            }
        }

        self::xLabels($im, $labels, $L, $slot, $T + $plotH + 40);

        return self::uri($im);
    }

    /**
     * Dona con texto central.
     *
     * @param  array<int, array{value: float, color: string}>  $slices
     */
    public static function donut(array $slices, string $center, string $caption = ''): ?string
    {
        $total = array_sum(array_column($slices, 'value'));

        if (! self::available() || $total <= 0) {
            return null;
        }

        $S = 520;
        $im = self::canvas($S, $S);
        $c = $S / 2;
        $white = imagecolorallocate($im, 255, 255, 255);
        $start = -90.0;

        foreach ($slices as $s) {
            $sweep = $s['value'] / $total * 360;

            if ($sweep > 0) {
                imagefilledarc($im, (int) $c, (int) $c, 500, 500, (int) round($start), (int) round($start + $sweep), self::color($im, $s['color']), IMG_ARC_PIE);
            }

            $start += $sweep;
        }

        // Separadores finos entre porciones (si hay más de una)
        if (count(array_filter($slices, fn ($s) => $s['value'] > 0)) > 1) {
            $a = -90.0;
            imagesetthickness($im, 5);

            foreach ($slices as $s) {
                imageline($im, (int) $c, (int) $c, (int) ($c + 260 * cos(deg2rad($a))), (int) ($c + 260 * sin(deg2rad($a))), $white);
                $a += $s['value'] / $total * 360;
            }

            imagesetthickness($im, 1);
        }

        imagefilledellipse($im, (int) $c, (int) $c, 316, 316, $white);
        self::text($im, 40, (int) $c, (int) $c + ($caption ? 4 : 14), [46, 10, 92], $center, 'center', true);

        if ($caption) {
            self::text($im, 20, (int) $c, (int) $c + 46, self::TEXT, $caption, 'center');
        }

        return self::uri($im);
    }

    // ------------------------------------------------------------------ utilidades

    private static function available(): bool
    {
        return function_exists('imagecreatetruecolor') && function_exists('imagettftext') && is_file(self::font());
    }

    private static function font(bool $bold = false): string
    {
        return base_path('vendor/dompdf/dompdf/lib/fonts/DejaVuSans'.($bold ? '-Bold' : '').'.ttf');
    }

    private static function canvas(int $w, int $h): \GdImage
    {
        $im = imagecreatetruecolor($w, $h);
        imageantialias($im, true);
        imagefill($im, 0, 0, imagecolorallocate($im, 255, 255, 255));

        return $im;
    }

    private static function color(\GdImage $im, string $hex): int
    {
        $hex = ltrim($hex, '#');

        return imagecolorallocate($im, hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2)));
    }

    /** Líneas guía horizontales con sus etiquetas de valor. */
    private static function grid(\GdImage $im, int $W, int $L, int $R, int $T, int $plotH, float $top, \Closure $fmt): void
    {
        for ($i = 0; $i <= 4; $i++) {
            $y = (int) ($T + $plotH * (1 - $i / 4));
            $c = imagecolorallocate($im, ...($i === 0 ? self::AXIS : self::GRID));
            imagesetthickness($im, $i === 0 ? 3 : 2);
            imageline($im, $L, $y, $W - $R, $y, $c);
            self::text($im, 17, $L - 14, $y + 6, self::TEXT, $fmt($top * $i / 4), 'right');
        }

        imagesetthickness($im, 1);
    }

    private static function xLabels(\GdImage $im, array $labels, int $L, float $slot, int $y): void
    {
        $every = max(1, (int) ceil(count($labels) / 14));

        foreach ($labels as $i => $label) {
            if ($i % $every === 0) {
                self::text($im, 16, (int) ($L + $slot * $i + $slot / 2), $y, self::TEXT, $label, 'center');
            }
        }
    }

    /** Barra con la parte superior redondeada. */
    private static function bar(\GdImage $im, int $x, int $base, int $w, int $h, int $color): void
    {
        if ($h <= 0) {
            return;
        }

        $r = (int) min(10, $w / 2, $h);
        imagefilledrectangle($im, $x, $base - $h + $r, $x + $w, $base, $color);

        if ($h > $r) {
            imagefilledrectangle($im, $x + $r, $base - $h, $x + $w - $r, $base - $h + $r, $color);
            imagefilledellipse($im, $x + $r, $base - $h + $r, $r * 2, $r * 2, $color);
            imagefilledellipse($im, $x + $w - $r, $base - $h + $r, $r * 2, $r * 2, $color);
        } else {
            imagefilledrectangle($im, $x, $base - $h, $x + $w, $base, $color);
        }
    }

    private static function text(\GdImage $im, int $size, int $x, int $y, array $rgb, string $str, string $align = 'left', bool $bold = false): void
    {
        $font = self::font($bold);
        $box = imagettfbbox($size, 0, $font, $str);
        $w = abs($box[4] - $box[0]);
        $x = match ($align) {
            'right' => $x - $w,
            'center' => (int) ($x - $w / 2),
            default => $x,
        };

        imagettftext($im, $size, 0, $x, $y, imagecolorallocate($im, ...$rgb), $font, $str);
    }

    /** Siguiente valor "redondo" (1, 2, 2.5, 5, 10 × 10^n) para el tope del eje. */
    private static function nice(float $max): float
    {
        $pow = 10 ** floor(log10($max));

        foreach ([1, 2, 2.5, 5, 10] as $m) {
            if ($max <= $m * $pow) {
                return (float) ($m * $pow);
            }
        }

        return (float) (10 * $pow);
    }

    private static function money(float $v): string
    {
        return match (true) {
            $v >= 1e6 => '$'.rtrim(rtrim(number_format($v / 1e6, 1), '0'), '.').'M',
            $v >= 1e3 => '$'.rtrim(rtrim(number_format($v / 1e3, 1), '0'), '.').'K',
            default => '$'.number_format($v, 0),
        };
    }

    private static function uri(\GdImage $im): string
    {
        ob_start();
        imagepng($im, null, 6);
        $png = ob_get_clean();
        imagedestroy($im);

        return 'data:image/png;base64,'.base64_encode($png);
    }
}
