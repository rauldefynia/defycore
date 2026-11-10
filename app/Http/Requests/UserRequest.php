<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $target = $this->route('user');
        $creating = $target === null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($target),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', Rule::in(array_keys(User::ROLES))],
            'active' => ['boolean'],
            'must_change_password' => ['boolean'],
            'password_expires' => ['boolean'],
            'password_expiry_days' => ['nullable', 'required_if:password_expires,true', 'integer', 'min:1', 'max:365'],
            // Al editar sólo se cambia si se activa "modificar contraseña", y exige
            // la contraseña del administrador que está haciendo el cambio.
            'change_password' => ['boolean'],
            'password' => [
                $creating || $this->boolean('change_password') ? 'required' : 'nullable',
                'string', Password::default(), 'confirmed',
            ],
            'admin_password' => [
                ! $creating && $this->boolean('change_password') ? 'required' : 'nullable',
                'string', 'current_password',
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'email' => 'correo',
            'phone' => 'teléfono',
            'role' => 'tipo de usuario',
            'password' => 'contraseña',
            'admin_password' => 'tu contraseña',
            'password_expiry_days' => 'días de vigencia',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Ya existe un usuario con este correo.',
            'admin_password.required' => 'Escribe tu contraseña de administrador para confirmar el cambio.',
            'admin_password.current_password' => 'Tu contraseña de administrador es incorrecta.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ];
    }
}
