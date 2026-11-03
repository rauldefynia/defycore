<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeedersTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeders_create_consistent_demo_data_and_are_idempotent(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class); // segunda corrida: no duplica

        $admin = User::where('email', 'admin@defynia.mx')->firstOrFail();
        $seller = User::where('email', 'vendedor@defynia.mx')->firstOrFail();
        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($seller->isAdmin());

        $this->assertSame(2, User::count());
        $this->assertSame(4, Client::count());
        $this->assertSame(3, Opportunity::count());
        $this->assertSame(3, Quote::count());
        $this->assertSame(2, Client::where('seller_id', $seller->id)->count());

        // La oportunidad principal tiene 2 cotizaciones y sólo una vigente (v2)
        $main = Opportunity::where('name', 'like', 'GIM%')->firstOrFail();
        $this->assertSame('presentado', $main->stage);
        $this->assertSame(2, $main->quotes()->count());
        $this->assertSame(1, $main->quotes()->where('active_with_client', true)->count());
        $this->assertSame('PRE-DEMO-002', $main->quotes()->where('active_with_client', true)->value('number'));

        // Totales coherentes: total = subtotal + IVA - descuento
        foreach (Quote::all() as $q) {
            $this->assertEqualsWithDelta($q->subtotal + $q->tax_amount - $q->global_discount_amount, $q->total, 0.02);
            $this->assertGreaterThan(0, $q->total);
        }

        // La v2 tiene plan de pagos que suma el total
        $v2 = Quote::where('number', 'PRE-DEMO-002')->firstOrFail();
        $this->assertEqualsWithDelta($v2->total, array_sum(array_column($v2->payment_schedule, 'amount')), 0.02);

        // El vendedor puede iniciar sesión y sólo ve lo suyo
        $this->post('/login', ['email' => 'vendedor@defynia.mx', 'password' => 'Vendedor12345!']);
        $this->assertAuthenticatedAs($seller);
        $this->get('/oportunidades')->assertInertia(fn ($p) => $p->has('opportunities', 3));
        $this->get('/clientes')->assertInertia(fn ($p) => $p->has('clients.data', 2));
    }

    public function test_demo_data_is_not_seeded_in_production(): void
    {
        $this->app['env'] = 'production';
        // Se invoca directo: `db:seed` pediría confirmación interactiva en producción.
        app(DatabaseSeeder::class)->run();

        $this->assertSame(1, User::count()); // sólo el administrador
        $this->assertSame(0, Client::count());
    }
}
