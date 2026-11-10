<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/** Pantalla obligatoria para estrenar contraseña (primer inicio de sesión o contraseña expirada). */
class ForcePasswordController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->mustChangePassword()) {
            return to_route('dashboard');
        }

        return Inertia::render('auth/force-password', [
            'reason' => $user->passwordExpired() && ! $user->must_change_password ? 'expired' : 'first_login',
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', Password::default(), 'confirmed', 'different:current_password'],
        ], [
            'current_password.current_password' => 'La contraseña actual no es correcta.',
            'password.different' => 'La nueva contraseña debe ser distinta de la actual.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ], [
            'current_password' => 'contraseña actual',
            'password' => 'nueva contraseña',
        ]);

        $request->user()->changePassword($data['password']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Contraseña actualizada.']);

        return to_route('dashboard');
    }
}
