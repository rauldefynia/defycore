<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Resuelve la IP real del cliente aun detrás de proxies, gateways o CDN.
 *
 * Sólo se confía en las cabeceras de reenvío si REMOTE_ADDR es un proxy de
 * confianza (config/network.php); de lo contrario cualquiera podría falsificarlas.
 */
class ClientIp
{
    public static function resolve(?Request $request): ?string
    {
        if (! $request) {
            return null;
        }

        $remote = $request->server->get('REMOTE_ADDR');

        if ($remote && static::isTrusted($request, $remote)) {
            foreach (config('network.client_ip_headers', []) as $header) {
                $value = $request->headers->get($header);

                if (! $value) {
                    continue;
                }

                // X-Forwarded-For: "cliente, proxy1, proxy2" -> primera IP pública válida.
                $candidates = array_map('trim', explode(',', $value));
                $valid = array_values(array_filter($candidates, fn ($ip) => static::valid($ip)));

                foreach ($valid as $ip) {
                    if (static::isPublic($ip)) {
                        return $ip;
                    }
                }

                // Red interna (LAN): se usa la primera IP válida, que es la del cliente.
                if ($valid) {
                    return $valid[0];
                }
            }
        }

        return $request->ip() ?? $remote;
    }

    protected static function valid(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP) !== false;
    }

    protected static function isPublic(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    protected static function isTrusted(Request $request, string $ip): bool
    {
        $trusted = config('network.trusted_proxies');

        if ($trusted === '*' || $trusted === '**') {
            return true;
        }

        $list = is_array($trusted) ? $trusted : array_filter(array_map('trim', explode(',', (string) $trusted)));

        return $list && \Symfony\Component\HttpFoundation\IpUtils::checkIp($ip, $list);
    }
}
