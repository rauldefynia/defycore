<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $over = []): array
    {
        return array_merge([
            'name' => 'Laura Vendedora',
            'email' => 'laura@defynia.mx',
            'phone' => '3312345678',
            'role' => 'seller',
            'active' => true,
            'password' => 'Clave-Segura-123',
            'password_confirmation' => 'Clave-Segura-123',
        ], $over);
    }

    private function quotePayload(array $over = []): array
    {
        return array_merge([
            'name' => 'Cot', 'date' => '2026-11-03', 'delivery_unit' => 'dias', 'currency' => 'MXN',
            'global_discount_type' => 'percentage',
            'items' => [['item_type' => 'producto', 'description' => 'X', 'quantity' => 1, 'cost_unit_without_discount' => 10]],
        ], $over);
    }

    public function test_seller_cannot_access_users_module(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/usuarios')->assertForbidden();
        $this->get('/usuarios/nuevo')->assertForbidden();
        $this->post('/usuarios', $this->payload())->assertForbidden();
    }

    public function test_admin_creates_edits_and_lists_users(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->get('/usuarios')->assertOk();
        $this->post('/usuarios', $this->payload())->assertRedirect();

        $u = User::where('email', 'laura@defynia.mx')->firstOrFail();
        $this->assertSame('seller', $u->role);
        $this->assertTrue($u->active);
        $this->assertNotNull($u->email_verified_at);
        $this->assertTrue(\Hash::check('Clave-Segura-123', $u->password));

        // Editar sin contraseña no la cambia; con contraseña sí.
        $this->put("/usuarios/{$u->id}", $this->payload(['name' => 'Laura M.', 'password' => '', 'password_confirmation' => '']))
            ->assertSessionHasNoErrors();
        $this->assertSame('Laura M.', $u->fresh()->name);
        $this->assertTrue(\Hash::check('Clave-Segura-123', $u->fresh()->password));

        $this->put("/usuarios/{$u->id}", $this->payload(['password' => 'Otra-Clave-456', 'password_confirmation' => 'Otra-Clave-456']));
        $this->assertTrue(\Hash::check('Otra-Clave-456', $u->fresh()->password));

        $this->get("/usuarios/{$u->id}/editar")->assertOk();
    }

    public function test_validation_unique_email_and_password_rules(): void
    {
        $this->actingAs(User::factory()->admin()->create(['email' => 'a@x.mx']));

        $this->post('/usuarios', $this->payload(['email' => 'a@x.mx']))->assertSessionHasErrors('email');
        $this->post('/usuarios', $this->payload(['password' => '123', 'password_confirmation' => '123']))->assertSessionHasErrors('password');
        $this->post('/usuarios', $this->payload(['role' => 'root']))->assertSessionHasErrors('role');
        $this->post('/usuarios', $this->payload(['password' => '']))->assertSessionHasErrors('password');
    }

    public function test_admin_cannot_lock_themselves_out_or_remove_last_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin);

        $this->put("/usuarios/{$admin->id}", $this->payload(['email' => $admin->email, 'role' => 'seller', 'password' => '', 'password_confirmation' => '']))
            ->assertSessionHasErrors('role');
        $this->put("/usuarios/{$admin->id}", $this->payload(['email' => $admin->email, 'role' => 'admin', 'active' => false, 'password' => '', 'password_confirmation' => '']))
            ->assertSessionHasErrors('role');
        $this->delete("/usuarios/{$admin->id}")->assertSessionHasErrors('role');
        $this->assertTrue($admin->fresh()->isAdmin());

        // Con otro administrador activo, uno sí puede degradar al otro.
        $other = User::factory()->admin()->create();
        $this->put("/usuarios/{$other->id}", $this->payload(['email' => $other->email, 'role' => 'seller', 'password' => '', 'password_confirmation' => '']))
            ->assertSessionHasNoErrors();
        $this->assertSame('seller', $other->fresh()->role);
    }

    public function test_user_with_history_cannot_be_deleted_but_clean_one_can(): void
    {
        $this->actingAs($admin = User::factory()->admin()->create());

        $seller = User::factory()->create();
        Opportunity::create(['name' => 'O', 'owner_id' => $seller->id]);
        $this->delete("/usuarios/{$seller->id}")->assertSessionHasErrors('user');
        $this->assertNotNull($seller->fresh());

        $clean = User::factory()->create();
        $this->delete("/usuarios/{$clean->id}")->assertRedirect('/usuarios');
        $this->assertNull($clean->fresh());
    }

    public function test_inactive_user_cannot_login_and_active_session_is_closed(): void
    {
        $user = User::factory()->inactive()->create(['email' => 'off@x.mx']);

        $this->post('/login', ['email' => 'off@x.mx', 'password' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        // Sesión abierta que luego se desactiva
        $active = User::factory()->create();
        $this->actingAs($active)->get('/dashboard')->assertOk();
        $active->forceFill(['active' => false])->save();
        $this->get('/dashboard')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_public_registration_is_disabled(): void
    {
        $this->get('/register')->assertNotFound();
    }

    public function test_seller_only_sees_own_quotes_clients_and_opportunities(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();

        $clientA = Client::create(['name' => 'Cliente A', 'rfc' => 'AAA010101AA1', 'seller_id' => $a->id]);
        $clientB = Client::create(['name' => 'Cliente B', 'rfc' => 'BBB010101BB1', 'seller_id' => $b->id]);
        Opportunity::create(['name' => 'Opp A', 'owner_id' => $a->id]);
        $oppB = Opportunity::create(['name' => 'Opp B', 'owner_id' => $b->id]);

        $this->actingAs($b)->post('/cotizaciones', $this->quotePayload(['name' => 'Cot B']));
        $quoteB = Quote::firstOrFail();

        // A: listas filtradas
        $this->actingAs($a);
        $this->get('/clientes')->assertInertia(fn ($p) => $p->has('clients.data', 1)->where('clients.data.0.name', 'Cliente A'));
        $this->get('/oportunidades')->assertInertia(fn ($p) => $p->has('opportunities', 1)->where('opportunities.0.name', 'Opp A'));
        $this->get('/cotizaciones')->assertInertia(fn ($p) => $p->has('quotes.data', 0));
        $this->get('/cotizaciones/nueva')->assertInertia(fn ($p) => $p->has('clients', 1));

        // A: acceso directo a lo de B bloqueado
        $this->get("/clientes/{$clientB->id}/editar")->assertForbidden();
        $this->put("/clientes/{$clientB->id}", ['name' => 'X', 'rfc' => 'BBB010101BB1'])->assertForbidden();
        $this->delete("/clientes/{$clientB->id}")->assertForbidden();
        $this->get("/oportunidades/{$oppB->id}")->assertForbidden();
        $this->get("/cotizaciones/{$quoteB->id}/editar")->assertForbidden();
        $this->get("/cotizaciones/{$quoteB->id}/pdf")->assertForbidden();

        // A no puede cotizar con el cliente de B ni ligar a la oportunidad de B
        $this->post('/cotizaciones', $this->quotePayload(['client_id' => $clientB->id]))->assertSessionHasErrors('client_id');
        $this->post('/cotizaciones', $this->quotePayload(['opportunity_id' => $oppB->id]))->assertSessionHasErrors('opportunity_id');
        $this->post('/oportunidades', ['name' => 'Z', 'client_id' => $clientB->id])->assertSessionHasErrors('client_id');

        // Y sí con los suyos
        $this->post('/cotizaciones', $this->quotePayload(['client_id' => $clientA->id]))->assertSessionHasNoErrors();
    }

    public function test_seller_creates_clients_assigned_to_self_even_if_forging_seller(): void
    {
        $a = User::factory()->create(['name' => 'Ana']);
        $b = User::factory()->create();

        $this->actingAs($a)->post('/clientes', [
            'name' => 'Nuevo', 'rfc' => 'NUE010101NN1', 'seller_id' => $b->id,
        ])->assertSessionHasNoErrors();

        $c = Client::firstOrFail();
        $this->assertSame($a->id, $c->seller_id);
        $this->assertSame('Ana', $c->seller_name);
    }

    public function test_admin_sees_everything(): void
    {
        $a = User::factory()->create();
        Client::create(['name' => 'C1', 'rfc' => 'AAA010101AA1', 'seller_id' => $a->id]);
        Client::create(['name' => 'C2', 'rfc' => 'BBB010101BB1']);
        Opportunity::create(['name' => 'O1', 'owner_id' => $a->id]);
        $this->actingAs($a)->post('/cotizaciones', $this->quotePayload());

        $this->actingAs(User::factory()->admin()->create());
        $this->get('/clientes')->assertInertia(fn ($p) => $p->has('clients.data', 2));
        $this->get('/oportunidades')->assertInertia(fn ($p) => $p->has('opportunities', 1));
        $this->get('/cotizaciones')->assertInertia(fn ($p) => $p->has('quotes.data', 1)->where('isAdmin', true));

        $quote = Quote::firstOrFail();
        $this->get("/cotizaciones/{$quote->id}/editar")->assertOk();
    }

    public function test_role_is_shared_and_not_editable_from_profile(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get('/settings/profile')
            ->assertInertia(fn ($p) => $p->where('auth.user.role', 'seller'));

        $this->patch('/settings/profile', ['name' => 'X', 'email' => $user->email, 'role' => 'admin']);
        $this->assertSame('seller', $user->fresh()->role);
    }
}
