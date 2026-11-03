<?php

use App\Models\Quote;
use App\Models\User;
use App\Services\QuoteCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function quotePayload(array $over = []): array
{
    return array_merge([
        'name' => 'Cotización de prueba',
        'date' => '2026-11-03',
        'due_date' => '2026-11-18',
        'delivery_unit' => 'dias',
        'delivery_days_min' => 1,
        'delivery_days_max' => 5,
        'currency' => 'MXN',
        'exchange_rate' => 1,
        'global_discount_type' => 'percentage',
        'global_discount_value' => 0,
        'items' => [[
            'item_type' => 'producto',
            'description' => 'Router',
            'quantity' => 2,
            'cost_unit_without_discount' => 100,
            'discount_percent' => 0,
            'target_margin_percent' => 20,
            'client_discount_percent' => 0,
        ]],
    ], $over);
}

it('calcula el precio con margen sobre venta', function () {
    $r = (new QuoteCalculator)->calculate(['currency' => 'MXN'], quotePayload()['items']);

    expect($r['items'][0]['sale_unit_price'])->toBe(125.0)
        ->and($r['quote']['subtotal'])->toBe(250.0)
        ->and($r['quote']['tax_amount'])->toBe(40.0)
        ->and($r['quote']['total'])->toBe(290.0)
        ->and($r['quote']['summary_margin_percent'])->toBe(20.0);
});

it('aplica el descuento general después del IVA y lo resta de la utilidad', function () {
    $r = (new QuoteCalculator)->calculate(
        ['currency' => 'MXN', 'global_discount_type' => 'percentage', 'global_discount_value' => 10],
        quotePayload()['items']
    );

    expect($r['quote']['global_discount_amount'])->toBe(29.0)
        ->and($r['quote']['total'])->toBe(261.0)
        ->and($r['quote']['summary_margin_percent'])->toBe(8.4);
});

it('limita el descuento fijo al total y el margen 100% da precio 0', function () {
    $calc = new QuoteCalculator;
    $r = $calc->calculate(['global_discount_type' => 'fixed', 'global_discount_value' => 99999], quotePayload()['items']);
    expect($r['quote']['total'])->toBe(0.0);

    $i = $calc->item(['cost_unit_without_discount' => 100, 'target_margin_percent' => 100]);
    expect($i['sale_unit_price'])->not->toBe(INF);
});

it('el calendario de pagos suma exactamente el total', function () {
    $s = (new QuoteCalculator)->schedule(1000.0, 333.33, 3, '2026-11-10');
    $sum = array_sum(array_column($s, 'amount'));

    expect(round($sum, 2))->toBe(1000.0)
        ->and(end($s)['balance'])->toBe(0.0)
        ->and($s[1]['date'])->toBe('2026-12-10');
});

it('crea, edita, duplica y elimina una cotización', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post('/cotizaciones', quotePayload([
        'has_payment_plan' => true, 'first_payment_type' => 'percentage',
        'first_payment_value' => 50, 'first_payment_date' => '2026-11-10', 'payment_months' => 2,
    ]))->assertRedirect();

    $quote = Quote::with('items')->firstOrFail();
    expect($quote->total)->toBe(290.0)
        ->and($quote->first_payment_amount)->toBe(145.0)
        ->and($quote->items)->toHaveCount(1)
        ->and($quote->number)->toStartWith('PRE-');

    $this->get("/cotizaciones/{$quote->id}/editar")->assertOk();

    $payload = quotePayload();
    $payload['items'][0]['quantity'] = 4;
    $this->put("/cotizaciones/{$quote->id}", $payload)->assertRedirect();
    expect($quote->fresh()->subtotal)->toBe(500.0);

    $this->post("/cotizaciones/{$quote->id}/duplicar")->assertRedirect();
    $copy = Quote::where('id', '!=', $quote->id)->firstOrFail();
    expect($copy->name)->toEndWith('-copia')->and($copy->items)->toHaveCount(1);

    $this->delete("/cotizaciones/{$quote->id}")->assertRedirect('/cotizaciones');
    expect(Quote::count())->toBe(1);
});

it('genera los tres PDFs', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/cotizaciones', quotePayload([
        'currency' => 'USD', 'exchange_rate' => 18, 'show_mxn_equivalent' => true,
        'global_discount_value' => 10,
        'has_payment_plan' => true, 'first_payment_type' => 'percentage',
        'first_payment_value' => 50, 'first_payment_date' => '2026-11-10', 'payment_months' => 3,
    ]));
    $quote = Quote::firstOrFail();

    foreach (['internal', 'client_mxn', 'client_usd'] as $type) {
        $res = $this->get("/cotizaciones/{$quote->id}/pdf?type={$type}");
        $res->assertOk();
        expect($res->headers->get('content-type'))->toContain('application/pdf');
    }
});

it('no permite ver cotizaciones de otro vendedor', function () {
    $owner = User::factory()->create();
    $this->actingAs($owner)->post('/cotizaciones', quotePayload());
    $quote = Quote::firstOrFail();

    $this->actingAs(User::factory()->create())
        ->get("/cotizaciones/{$quote->id}/editar")->assertForbidden();
});
