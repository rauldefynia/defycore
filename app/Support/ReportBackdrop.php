<?php

namespace App\Support;

/**
 * Fondos del PDF de reportes generados con GD (dompdf no soporta degradados ni desenfoque).
 * Se crean una vez y se guardan en caché en storage; sube VERSION para regenerarlos.
 */
class ReportBackdrop
{
    private const VERSION = 2;

    private const W = 900;

    private const H = 1273;

    /** Portada: degradado profundo con orbes de color y anillos de "cristal". */
    public static function cover(): ?string
    {
        return self::cached('cover', function () {
            $im = self::canvas([[22, 4, 54], [52, 12, 110], [30, 8, 78]]);

            self::orb($im, 760, 180, 520, [217, 70, 239], 0.30);
            self::orb($im, 80, 1020, 600, [124, 58, 237], 0.38);
            self::orb($im, 650, 820, 380, [56, 189, 248], 0.16);
            self::orb($im, 140, 260, 300, [99, 102, 241], 0.22);

            // Anillos finos que simulan el borde de un vidrio
            imagealphablending($im, true);
            imagesetthickness($im, 2);
            foreach ([[700, 240, 520, 60], [700, 240, 700, 36], [210, 980, 560, 44]] as [$x, $y, $d, $a]) {
                imageellipse($im, $x, $y, $d, $d, imagecolorallocatealpha($im, 255, 255, 255, 127 - (int) ($a * 0.6)));
            }

            return $im;
        });
    }

    /** Fondo de las páginas interiores: lavanda muy suave con halos de color en las esquinas. */
    public static function page(): ?string
    {
        return self::cached('page', function () {
            $im = self::canvas([[252, 250, 255], [245, 241, 254], [250, 246, 255]]);

            self::orb($im, 820, 60, 520, [167, 139, 250], 0.12);
            self::orb($im, 40, 1180, 560, [244, 114, 182], 0.09);
            self::orb($im, 120, 380, 340, [125, 211, 252], 0.10);
            self::orb($im, 800, 880, 380, [196, 181, 253], 0.10);

            return $im;
        });
    }

    private static function cached(string $name, \Closure $draw): ?string
    {
        if (! function_exists('imagecreatetruecolor')) {
            return null;
        }

        $dir = storage_path('app/report-assets');
        $file = "{$dir}/{$name}-v".self::VERSION.'.jpg';

        if (is_file($file)) {
            return $file;
        }

        if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
            return null;
        }

        $im = $draw();
        $ok = imagejpeg($im, $file, 90);
        imagedestroy($im);

        return $ok ? $file : null;
    }

    /** Lienzo con degradado vertical entre tres colores. */
    private static function canvas(array $stops): \GdImage
    {
        $im = imagecreatetruecolor(self::W, self::H);

        for ($y = 0; $y < self::H; $y++) {
            $t = $y / (self::H - 1) * 2;
            [$a, $b, $k] = $t < 1 ? [$stops[0], $stops[1], $t] : [$stops[1], $stops[2], $t - 1];
            $c = imagecolorallocate(
                $im,
                (int) ($a[0] + ($b[0] - $a[0]) * $k),
                (int) ($a[1] + ($b[1] - $a[1]) * $k),
                (int) ($a[2] + ($b[2] - $a[2]) * $k),
            );
            imageline($im, 0, $y, self::W, $y, $c);
        }

        return $im;
    }

    /** Halo difuminado: elipses concéntricas casi transparentes que se acumulan hacia el centro. */
    private static function orb(\GdImage $im, int $cx, int $cy, int $diameter, array $rgb, float $strength): void
    {
        imagealphablending($im, true);
        $steps = 70;
        $alpha = 127 - (int) round(12 * $strength);

        for ($i = 0; $i < $steps; $i++) {
            $d = (int) ($diameter * (1 - $i / $steps));
            imagefilledellipse($im, $cx, $cy, $d, $d, imagecolorallocatealpha($im, $rgb[0], $rgb[1], $rgb[2], $alpha));
        }
    }
}
