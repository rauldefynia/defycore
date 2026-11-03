<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $over = []): array
    {
        return array_merge([
            'name' => 'Grupo Industrial Morelos',
            'rfc' => 'gim010101ab1',
            'contact' => 'Rodrigo Cárdenas',
            'email' => 'rodrigo@gim.mx',
        ], $over);
    }

    public function test_requires_authentication(): void
    {
        $this->get('/clientes')->assertRedirect('/login');
    }

    public function test_crud(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/clientes')->assertOk();
        $this->get('/clientes/nuevo')->assertOk();

        $this->post('/clientes', $this->payload())->assertRedirect();
        $client = Client::firstOrFail();
        $this->assertSame('GIM010101AB1', $client->rfc);
        $this->assertSame('Mexico', $client->country);

        $this->get("/clientes/{$client->id}/editar")->assertOk();
        $this->put("/clientes/{$client->id}", $this->payload(['name' => 'Nuevo nombre']))->assertRedirect();
        $this->assertSame('Nuevo nombre', $client->fresh()->name);

        $this->delete("/clientes/{$client->id}")->assertRedirect('/clientes');
        $this->assertSame(0, Client::count());
    }

    public function test_stores_seller_and_reference(): void
    {
        $seller = User::factory()->create(['name' => 'Ana López']);
        $this->actingAs(User::factory()->admin()->create());

        $this->post('/clientes', $this->payload([
            'seller_id' => $seller->id,
            'reference_contact' => 'Luis Pérez',
            'reference_email' => 'luis@ref.mx',
            'reference_phone' => '3312345678',
        ]))->assertSessionHasNoErrors();

        $c = Client::firstOrFail();
        $this->assertSame('Ana López', $c->seller_name);
        $this->assertSame($seller->id, $c->seller_id);
        $this->assertSame('Luis Pérez', $c->reference_contact);
        $this->assertSame('3312345678', $c->reference_phone);

        $this->post('/clientes', $this->payload(['rfc' => 'ABC010101AB1', 'reference_email' => 'malo']))
            ->assertSessionHasErrors('reference_email');
    }

    public function test_validates_rfc_format_and_uniqueness(): void
    {
        $this->actingAs(User::factory()->create());

        $this->post('/clientes', $this->payload(['rfc' => 'INVALIDO']))->assertSessionHasErrors('rfc');

        $this->post('/clientes', $this->payload());
        $this->post('/clientes', $this->payload())->assertSessionHasErrors('rfc');

        // Editar sin cambiar el RFC no debe chocar consigo mismo.
        $client = Client::firstOrFail();
        $this->put("/clientes/{$client->id}", $this->payload())->assertSessionHasNoErrors();
    }

    public function test_client_is_usable_in_quotes_and_snapshot_survives_changes(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $client = Client::create($this->payload(['rfc' => 'GIM010101AB1', 'seller_id' => $user->id]));

        $this->get('/cotizaciones/nueva')->assertOk()->assertInertia(
            fn ($page) => $page->has('clients', 1)->where('clients.0.name', 'Grupo Industrial Morelos')
        );

        $this->post('/cotizaciones', [
            'name' => 'Q', 'date' => '2026-11-03', 'delivery_unit' => 'dias',
            'currency' => 'MXN', 'global_discount_type' => 'percentage', 'client_id' => $client->id,
            'items' => [[
                'item_type' => 'producto', 'description' => 'X', 'quantity' => 1,
                'cost_unit_without_discount' => 10,
            ]],
        ])->assertRedirect();

        $quote = Quote::firstOrFail();
        $this->assertSame('Grupo Industrial Morelos', $quote->client_data['name']);
        $this->assertSame('Rodrigo Cárdenas', $quote->client_data['contact']);

        $this->put("/clientes/{$client->id}", $this->payload(['name' => 'Otro']));
        $this->delete("/clientes/{$client->id}");

        $quote->refresh();
        $this->assertNull($quote->client_id);
        $this->assertSame('Grupo Industrial Morelos', $quote->client_data['name']);
    }
}
