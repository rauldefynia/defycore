<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Captcha propio, sin servicios de terceros.
 *
 * El servidor elige una pregunta con solución predefinida (banco de preguntas o
 * suma/resta generada), la dibuja como imagen SVG con ruido y guarda en sesión
 * únicamente el hash de la opción correcta. La respuesta nunca viaja al navegador,
 * es de un solo uso y caduca.
 */
class Captcha
{
    private const SESSION_KEY = 'captcha.challenge';

    /** Segundos mínimos (anti-bot) y máximos (caducidad) para resolverlo. */
    private const MIN_SECONDS = 2;
    private const MAX_SECONDS = 600;

    /** Banco de preguntas: [pregunta, respuesta correcta, [distractores]]. */
    private const BANK = [
        ['¿Cuántos días tiene una semana?', '7', ['5', '6', '10', '12']],
        ['¿Cuántos meses tiene un año?', '12', ['10', '11', '13', '52']],
        ['¿De qué color es el cielo despejado?', 'Azul', ['Verde', 'Rojo', 'Negro', 'Morado']],
        ['¿De qué color es el pasto?', 'Verde', ['Azul', 'Rojo', 'Blanco', 'Morado']],
        ['¿Qué día sigue después del lunes?', 'Martes', ['Domingo', 'Jueves', 'Viernes', 'Miércoles']],
        ['¿Qué mes sigue después de marzo?', 'Abril', ['Febrero', 'Mayo', 'Junio', 'Enero']],
        ['¿Cuál es la capital de México?', 'Ciudad de México', ['Guadalajara', 'Monterrey', 'Puebla', 'Cancún']],
        ['¿Cuántas ruedas tiene una bicicleta?', '2', ['1', '3', '4', '6']],
        ['¿Cuántos lados tiene un triángulo?', '3', ['2', '4', '5', '6']],
        ['¿Cuál es un animal?', 'Perro', ['Mesa', 'Silla', 'Lápiz', 'Ventana']],
        ['¿Cuál es una fruta?', 'Manzana', ['Zapato', 'Camisa', 'Teclado', 'Cuaderno']],
        ['¿Qué se usa para escribir?', 'Lápiz', ['Cuchara', 'Almohada', 'Toalla', 'Llave']],
        ['¿Cuántos minutos tiene una hora?', '60', ['30', '100', '24', '90']],
        ['¿Cuántas horas tiene un día?', '24', ['12', '48', '60', '20']],
        ['¿Cuál es el opuesto de "frío"?', 'Caliente', ['Helado', 'Oscuro', 'Lento', 'Pesado']],
        ['¿Cuál es el opuesto de "arriba"?', 'Abajo', ['Izquierda', 'Adelante', 'Cerca', 'Lejos']],
    ];

    public static function enabled(): bool
    {
        return (bool) config('captcha.enabled', true);
    }

    /**
     * Genera un reto nuevo (invalida el anterior) y devuelve lo que ve el navegador.
     *
     * @return array{image: string, options: list<array{id: string, label: string}>}
     */
    public static function generate(Request $request): array
    {
        [$question, $answer, $wrong] = static::pick();

        $labels = array_merge([$answer], static::sample($wrong, 3));
        shuffle($labels);

        $options = [];
        $correctId = null;

        foreach ($labels as $label) {
            $id = Str::random(12);
            $options[] = ['id' => $id, 'label' => $label];

            if ($label === $answer) {
                $correctId = $id;
            }
        }

        $request->session()->put(self::SESSION_KEY, [
            'hash' => hash_hmac('sha256', $correctId, (string) config('app.key')),
            'at' => now()->timestamp,
        ]);

        return [
            'image' => 'data:image/svg+xml;base64,'.base64_encode(static::svg($question)),
            'options' => $options,
        ];
    }

    /** Valida y consume el reto (un solo intento por reto generado). */
    public static function verify(Request $request, ?string $answer): bool
    {
        // Fortify invoca el callback de autenticación más de una vez por petición.
        if ($request->attributes->has('captcha.result')) {
            return $request->attributes->get('captcha.result');
        }

        return tap(static::check($request, $answer), fn ($ok) => $request->attributes->set('captcha.result', $ok));
    }

    private static function check(Request $request, ?string $answer): bool
    {
        $challenge = $request->session()->pull(self::SESSION_KEY);

        if (! $challenge || ! is_string($answer) || $answer === '') {
            return false;
        }

        $age = now()->timestamp - (int) $challenge['at'];

        if ($age < self::MIN_SECONDS || $age > self::MAX_SECONDS) {
            return false;
        }

        return hash_equals($challenge['hash'], hash_hmac('sha256', $answer, (string) config('app.key')));
    }

    /** @return array{0: string, 1: string, 2: list<string>} */
    private static function pick(): array
    {
        // 1 de cada 3 retos es aritmética generada, para ampliar el espacio de preguntas.
        if (random_int(1, 3) === 1) {
            $a = random_int(2, 15);
            $b = random_int(1, 9);
            $plus = (bool) random_int(0, 1);
            $result = $plus ? $a + $b : $a - $b;

            $wrong = [];
            while (count($wrong) < 4) {
                $candidate = (string) ($result + random_int(-5, 5));

                if ($candidate !== (string) $result && ! in_array($candidate, $wrong, true)) {
                    $wrong[] = $candidate;
                }
            }

            return ["¿Cuánto es $a ".($plus ? '+' : '-')." $b?", (string) $result, $wrong];
        }

        return self::BANK[array_rand(self::BANK)];
    }

    /** @param list<string> $items @return list<string> */
    private static function sample(array $items, int $n): array
    {
        shuffle($items);

        return array_slice($items, 0, $n);
    }

    /** Dibuja la pregunta como SVG con letras irregulares y ruido (difícil de leer para un script simple). */
    private static function svg(string $text): string
    {
        $w = 340;
        $h = 64;
        $out = '<svg xmlns="http://www.w3.org/2000/svg" width="'.$w.'" height="'.$h.'" viewBox="0 0 '.$w.' '.$h.'">'
            .'<rect width="100%" height="100%" fill="#f4f4f5"/>';

        for ($i = 0; $i < 6; $i++) {
            $out .= sprintf(
                '<path d="M%d %d Q%d %d %d %d" stroke="#%s" stroke-width="1.2" fill="none" opacity=".55"/>',
                random_int(0, $w), random_int(0, $h), random_int(0, $w), random_int(0, $h),
                random_int(0, $w), random_int(0, $h), dechex(random_int(0x555555, 0xaaaaaa)),
            );
        }

        $chars = mb_str_split($text);
        $step = ($w - 24) / max(count($chars), 1);
        $x = 12;

        foreach ($chars as $char) {
            $out .= sprintf(
                '<text x="%.1f" y="%d" font-family="Arial, Helvetica, sans-serif" font-size="%d" font-weight="bold" fill="#%s" transform="rotate(%d %.1f %d)">%s</text>',
                $x, random_int(36, 44), random_int(17, 21), dechex(random_int(0x111111, 0x444444)),
                random_int(-12, 12), $x, 36, htmlspecialchars($char, ENT_XML1 | ENT_QUOTES, 'UTF-8'),
            );
            $x += $step;
        }

        for ($i = 0; $i < 25; $i++) {
            $out .= sprintf(
                '<circle cx="%d" cy="%d" r="1" fill="#%s" opacity=".6"/>',
                random_int(0, $w), random_int(0, $h), dechex(random_int(0x444444, 0x999999)),
            );
        }

        return $out.'</svg>';
    }
}
