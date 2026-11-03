<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Microsoft\MicrosoftException;
use App\Services\Microsoft\MicrosoftGraph;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * SSO con Microsoft 365.
 *  - Sin sesión: inicia sesión (sólo usuarios que ya existen y están activos; no crea cuentas).
 *  - Con sesión: vincula la cuenta Microsoft al usuario actual (necesario para enviar correo).
 *
 * Nota: Microsoft aplica su propia MFA, por lo que el SSO no pide el 2FA local de Fortify.
 */
class MicrosoftAuthController extends Controller
{
    public function __construct(private MicrosoftGraph $microsoft) {}

    public function redirect(Request $request): RedirectResponse
    {
        if (! $this->microsoft->enabled()) {
            return $this->fail($request, 'El inicio de sesión con Microsoft no está configurado.');
        }

        $auth = $this->microsoft->authorization();

        $request->session()->put('microsoft', [
            'state' => $auth['state'],
            'verifier' => $auth['verifier'],
            // La intención se fija ahora (no en el callback) para que no pueda cambiarse en el camino.
            'link' => Auth::check(),
        ]);

        return redirect()->away($auth['url']);
    }

    public function callback(Request $request): RedirectResponse
    {
        $flow = $request->session()->pull('microsoft');

        if (! $flow || ! hash_equals($flow['state'], (string) $request->query('state'))) {
            return $this->fail($request, 'La sesión de Microsoft no es válida o expiró. Inténtalo de nuevo.');
        }

        if ($request->filled('error')) {
            $msg = $request->query('error') === 'access_denied'
                ? 'Cancelaste el acceso con Microsoft.'
                : 'Microsoft devolvió un error: '.$request->query('error_description', $request->query('error'));

            return $this->fail($request, $msg, $flow['link']);
        }

        if (! $request->filled('code')) {
            return $this->fail($request, 'Microsoft no devolvió un código de autorización.', $flow['link']);
        }

        try {
            $tokens = $this->microsoft->exchangeCode((string) $request->query('code'), $flow['verifier']);
            $profile = $this->microsoft->me($tokens['access_token']);
        } catch (MicrosoftException $e) {
            return $this->fail($request, $e->getMessage(), $flow['link']);
        }

        if (! $this->domainAllowed($profile['email'])) {
            return $this->fail($request, 'Tu dominio de correo no está autorizado para este sistema.', $flow['link']);
        }

        return $flow['link'] && Auth::check()
            ? $this->link($request, $profile, $tokens)
            : $this->login($request, $profile, $tokens);
    }

    public function disconnect(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'microsoft_id' => null,
            'microsoft_email' => null,
            'microsoft_access_token' => null,
            'microsoft_refresh_token' => null,
            'microsoft_token_expires_at' => null,
        ])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cuenta de Microsoft desconectada.']);

        return back();
    }

    /** @param array{id: string, name: ?string, email: string} $profile */
    private function login(Request $request, array $profile, array $tokens): RedirectResponse
    {
        $user = User::where('microsoft_id', $profile['id'])->first();

        // Primer acceso: se vincula por correo, pero sólo si el tenant es el de la organización
        // (con un tenant genérico cualquiera podría declarar el correo de otra persona).
        if (! $user && $this->microsoft->trustsEmail() && $profile['email'] !== '') {
            $user = User::whereRaw('LOWER(email) = ?', [$profile['email']])->first();

            if ($user && $user->microsoft_id && $user->microsoft_id !== $profile['id']) {
                $user = null; // ese usuario ya está vinculado a otra cuenta Microsoft
            }
        }

        if (! $user) {
            return $this->fail($request, 'Tu cuenta de Microsoft no tiene acceso a este sistema. Pide a un administrador que te dé de alta con tu correo.');
        }

        if (! $user->active) {
            return $this->fail($request, 'Tu cuenta está desactivada. Contacta a un administrador.');
        }

        $user->forceFill([
            'microsoft_id' => $profile['id'],
            'microsoft_email' => $profile['email'],
            'email_verified_at' => $user->email_verified_at ?? now(),
        ]);
        $this->microsoft->storeTokens($user, $tokens);

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /** @param array{id: string, name: ?string, email: string} $profile */
    private function link(Request $request, array $profile, array $tokens): RedirectResponse
    {
        $user = $request->user();

        $taken = User::where('microsoft_id', $profile['id'])->where('id', '!=', $user->id)->exists();

        if ($taken) {
            return $this->fail($request, 'Esa cuenta de Microsoft ya está vinculada a otro usuario.', true);
        }

        $user->forceFill(['microsoft_id' => $profile['id'], 'microsoft_email' => $profile['email']]);
        $this->microsoft->storeTokens($user, $tokens);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cuenta de Microsoft 365 conectada.']);

        return to_route('profile.edit');
    }

    private function domainAllowed(string $email): bool
    {
        $allowed = config('services.microsoft.allowed_domains');

        if (! $allowed) {
            return true;
        }

        return in_array(strtolower(substr(strrchr($email, '@') ?: '', 1)), array_map('strtolower', $allowed), true);
    }

    private function fail(Request $request, string $message, ?bool $link = null): RedirectResponse
    {
        if ($link ?? Auth::check()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $message]);

            return to_route('profile.edit');
        }

        return to_route('login')->withErrors(['email' => $message]);
    }
}
