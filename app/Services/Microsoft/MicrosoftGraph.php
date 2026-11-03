<?php

namespace App\Services\Microsoft;

use App\Models\User;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Cliente mínimo de Microsoft Entra ID (OAuth 2.0 + PKCE) y Microsoft Graph.
 * Se usa con permisos DELEGADOS: el correo sale del buzón del propio usuario.
 */
class MicrosoftGraph
{
    private const LOGIN = 'https://login.microsoftonline.com';

    private const GRAPH = 'https://graph.microsoft.com/v1.0';

    /** Tenants genéricos: aceptan cuentas de cualquier organización. */
    private const GENERIC_TENANTS = ['common', 'organizations', 'consumers'];

    public function enabled(): bool
    {
        return filled(config('services.microsoft.client_id'))
            && filled(config('services.microsoft.client_secret'))
            && filled(config('services.microsoft.redirect'));
    }

    public function tenant(): string
    {
        return config('services.microsoft.tenant') ?: 'common';
    }

    /**
     * Con un tenant genérico el correo de la cuenta NO es de fiar (otro tenant puede declarar
     * cualquier correo), así que sólo se permite entrar a cuentas ya vinculadas por su `id`.
     */
    public function trustsEmail(): bool
    {
        return ! in_array(strtolower($this->tenant()), self::GENERIC_TENANTS, true);
    }

    /** @return array{url: string, state: string, verifier: string} */
    public function authorization(): array
    {
        $state = Str::random(40);
        $verifier = Str::random(64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        $query = http_build_query([
            'client_id' => config('services.microsoft.client_id'),
            'response_type' => 'code',
            'redirect_uri' => config('services.microsoft.redirect'),
            'response_mode' => 'query',
            'scope' => implode(' ', config('services.microsoft.scopes')),
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
            // Siempre deja elegir cuenta: evita entrar con la sesión Microsoft equivocada.
            'prompt' => 'select_account',
        ], '', '&', PHP_QUERY_RFC3986);

        return [
            'url' => self::LOGIN.'/'.$this->tenant().'/oauth2/v2.0/authorize?'.$query,
            'state' => $state,
            'verifier' => $verifier,
        ];
    }

    /**
     * Cambia el código por tokens.
     *
     * @return array{access_token: string, refresh_token: ?string, expires_in: int}
     */
    public function exchangeCode(string $code, string $verifier): array
    {
        return $this->token([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => config('services.microsoft.redirect'),
            'code_verifier' => $verifier,
        ]);
    }

    /** @return array{access_token: string, refresh_token: ?string, expires_in: int} */
    public function refresh(string $refreshToken): array
    {
        return $this->token([
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
            'scope' => implode(' ', config('services.microsoft.scopes')),
        ]);
    }

    /** Perfil de la cuenta: id, nombre y correo. */
    public function me(string $accessToken): array
    {
        $r = Http::withToken($accessToken)->acceptJson()
            ->get(self::GRAPH.'/me', ['$select' => 'id,displayName,mail,userPrincipalName']);

        if ($r->failed()) {
            throw new MicrosoftException('No se pudo leer el perfil de Microsoft.');
        }

        $data = $r->json();

        return [
            'id' => (string) $data['id'],
            'name' => $data['displayName'] ?? null,
            'email' => strtolower((string) ($data['mail'] ?? $data['userPrincipalName'] ?? '')),
        ];
    }

    /** Token vigente del usuario; lo renueva si venció (o está por vencer). */
    public function accessTokenFor(User $user): string
    {
        if (! $user->microsoft_refresh_token) {
            throw new MicrosoftException('Conecta tu cuenta de Microsoft 365 en Configuración para enviar correos.');
        }

        $fresh = $user->microsoft_access_token
            && $user->microsoft_token_expires_at
            && $user->microsoft_token_expires_at->gt(now()->addMinute());

        return $fresh ? $user->microsoft_access_token : $this->refreshFor($user);
    }

    public function refreshFor(User $user): string
    {
        try {
            $tokens = $this->refresh((string) $user->microsoft_refresh_token);
        } catch (MicrosoftException $e) {
            // El refresh token expiró o fue revocado: hay que volver a conectar.
            $user->forceFill([
                'microsoft_access_token' => null,
                'microsoft_refresh_token' => null,
                'microsoft_token_expires_at' => null,
            ])->save();

            throw new MicrosoftException('Tu conexión con Microsoft 365 expiró. Vuelve a conectarla en Configuración.');
        }

        $this->storeTokens($user, $tokens);

        return $tokens['access_token'];
    }

    /** @param array{access_token: string, refresh_token: ?string, expires_in: int} $tokens */
    public function storeTokens(User $user, array $tokens): void
    {
        $user->forceFill([
            'microsoft_access_token' => $tokens['access_token'],
            // Microsoft puede rotar el refresh token; si no manda uno nuevo se conserva el actual.
            'microsoft_refresh_token' => $tokens['refresh_token'] ?? $user->microsoft_refresh_token,
            'microsoft_token_expires_at' => now()->addSeconds((int) $tokens['expires_in']),
        ])->save();
    }

    /**
     * Envía un correo desde el buzón del usuario (POST /me/sendMail).
     *
     * @param  array<int, string>  $to
     * @param  array<int, string>  $cc
     * @param  array{name: string, content: string, type?: string}|null  $attachment  content = binario
     */
    public function sendMail(User $user, array $to, array $cc, string $subject, string $html, ?array $attachment = null): void
    {
        $message = [
            'subject' => $subject,
            'body' => ['contentType' => 'HTML', 'content' => $html],
            'toRecipients' => $this->recipients($to),
        ];

        if ($cc) {
            $message['ccRecipients'] = $this->recipients($cc);
        }

        if ($attachment) {
            $message['attachments'] = [[
                '@odata.type' => '#microsoft.graph.fileAttachment',
                'name' => $attachment['name'],
                'contentType' => $attachment['type'] ?? 'application/pdf',
                'contentBytes' => base64_encode($attachment['content']),
            ]];
        }

        $payload = ['message' => $message, 'saveToSentItems' => true];

        $response = $this->graph($this->accessTokenFor($user))->post('/me/sendMail', $payload);

        // 401: el token fue revocado antes de vencer; se renueva y se reintenta una vez.
        if ($response->status() === 401) {
            $response = $this->graph($this->refreshFor($user))->post('/me/sendMail', $payload);
        }

        if ($response->status() === 403) {
            throw new MicrosoftException('Tu cuenta no tiene permiso para enviar correo (Mail.Send). Vuelve a conectar Microsoft 365 y acepta los permisos, o pide a tu administrador que los apruebe.');
        }

        if ($response->failed()) {
            $detail = $response->json('error.message') ?? "HTTP {$response->status()}";

            throw new MicrosoftException("Microsoft no pudo enviar el correo: {$detail}");
        }
    }

    private function graph(string $token): PendingRequest
    {
        return Http::withToken($token)->acceptJson()->asJson()->baseUrl(self::GRAPH)->timeout(60);
    }

    /** @param  array<int, string>  $emails */
    private function recipients(array $emails): array
    {
        return array_map(fn ($e) => ['emailAddress' => ['address' => $e]], array_values($emails));
    }

    /** @return array{access_token: string, refresh_token: ?string, expires_in: int} */
    private function token(array $params): array
    {
        try {
            $r = Http::asForm()->acceptJson()->post(self::LOGIN.'/'.$this->tenant().'/oauth2/v2.0/token', $params + [
                'client_id' => config('services.microsoft.client_id'),
                'client_secret' => config('services.microsoft.client_secret'),
            ])->throw();
        } catch (RequestException $e) {
            $reason = $e->response->json('error_description') ?? $e->getMessage();

            throw new MicrosoftException('Microsoft rechazó la autenticación: '.Str::before((string) $reason, "\r\n"), previous: $e);
        }

        if (! $r->json('access_token')) {
            throw new MicrosoftException('Microsoft no devolvió un token de acceso.');
        }

        return [
            'access_token' => $r->json('access_token'),
            'refresh_token' => $r->json('refresh_token'),
            'expires_in' => (int) $r->json('expires_in', 3600),
        ];
    }
}
