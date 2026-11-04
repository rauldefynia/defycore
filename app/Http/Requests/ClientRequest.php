<?php

namespace App\Http\Requests;

use App\Models\Contact;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClientRequest extends FormRequest
{
    public const RFC = '/^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/u';

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('rfc')) {
            $this->merge(['rfc' => strtoupper(trim((string) $this->input('rfc')))]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'rfc' => [
                'required', 'string', 'regex:'.self::RFC,
                Rule::unique('clients', 'rfc')->ignore($this->route('client')),
            ],
            'contact' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'seller_id' => ['nullable', 'integer', 'exists:users,id'],
            'reference_contact' => ['nullable', 'string', 'max:255'],
            'reference_email' => ['nullable', 'email', 'max:255'],
            'reference_phone' => ['nullable', 'string', 'max:50'],
            'contact_ids' => ['nullable', 'array', 'max:50'],
            'contact_ids.*' => ['integer', 'distinct', Contact::existsRule($this->user())],
            'address' => ['nullable', 'string', 'max:255'],
            'zip' => ['nullable', 'string', 'max:10'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'rfc.regex' => 'El RFC no tiene un formato válido.',
            'rfc.unique' => 'Ya existe un cliente con este RFC.',
        ];
    }
}
