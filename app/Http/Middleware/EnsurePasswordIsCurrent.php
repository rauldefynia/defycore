<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Obliga a cambiar la contraseña cuando el administrador lo exigió (primer inicio de sesión)
 * o cuando la contraseña expiró. Quien entró con Microsoft 365 no usa la contraseña local, así que se omite.
 */
class EnsurePasswordIsCurrent
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user
            && $user->mustChangePassword()
            && ! $request->session()->get('auth_via_microsoft')
            && ! $request->routeIs('password.force.*', 'logout')
        ) {
            return redirect()->route('password.force.show');
        }

        return $next($request);
    }
}
