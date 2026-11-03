<?php

namespace App\Http\Requests;

use App\Models\Client;
use App\Services\QuoteCalculator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:date'],
            'delivery_unit' => ['required', Rule::in(['dias', 'semanas', 'meses', 'personalizado'])],
            'delivery_days_min' => ['nullable', 'integer', 'min:0'],
            'delivery_days_max' => ['nullable', 'integer', 'min:0', 'gte:delivery_days_min'],
            'notes' => ['nullable', 'string'],
            'client_id' => ['nullable', Client::existsRule($this->user())],
            'issuer_id' => ['nullable', 'exists:issuers,id'],
            'opportunity_id' => [
                'nullable',
                $this->user()->isAdmin()
                    ? Rule::exists('opportunities', 'id')
                    : Rule::exists('opportunities', 'id')->where('owner_id', $this->user()->id),
            ],

            'currency' => ['required', Rule::in(QuoteCalculator::CURRENCIES)],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'show_mxn_equivalent' => ['boolean'],

            'global_discount_type' => ['required', Rule::in(['percentage', 'fixed'])],
            'global_discount_value' => ['nullable', 'numeric', 'min:0'],

            'has_payment_plan' => ['boolean'],
            'first_payment_type' => ['nullable', Rule::in(['percentage', 'fixed'])],
            'first_payment_value' => ['nullable', 'numeric', 'min:0'],
            'first_payment_date' => ['nullable', 'date'],
            'payment_months' => ['nullable', 'integer', 'between:1,120'],
            'payment_terms' => ['nullable', 'string'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', Rule::in(['producto', 'servicio'])],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.detail' => ['nullable', 'string'],
            'items.*.sku' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:1'],
            'items.*.cost_unit_without_discount' => ['required', 'numeric', 'min:0'],
            'items.*.discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'items.*.target_margin_percent' => ['nullable', 'numeric', 'between:0,99.99'],
            'items.*.client_discount_percent' => ['nullable', 'numeric', 'between:0,100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'items.*.description' => 'descripción',
            'items.*.quantity' => 'cantidad',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if ($this->boolean('has_payment_plan') && ! $this->filled('first_payment_date')) {
                $v->errors()->add('first_payment_date', 'La fecha del anticipo es requerida con plan de pagos.');
            }
        });
    }
}
