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
            // Al editar, la contraseña es opcional (vacía = no cambiar).
            'password' => [
                $creating ? 'required' : 'nullable',
                'string', Password::default(), 'confirmed',
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
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Ya existe un usuario con este correo.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ];
    }
}
