<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    private function seller(string $name = 'Vera'): User
    {
        return User::factory()->create(['role' => 'seller', 'active' => true, 'name' => $name]);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'active' => true]);
    }

    private function contact(User $owner, array $over = []): Contact
    {
        return Contact::create(array_merge(['name' => 'Laura Pérez', 'owner_id' => $owner->id], $over));
    }

    public function test_seller_creates_contact_as_owner_and_cannot_reassign(): void
    {
        $me = $this->seller();
        $other = $this->seller('Otro');

        $this->actingAs($me)->post('/contactos', [
            'name' => 'Laura Pérez', 'email' => 'laura@x.mx', 'owner_id' => $other->id,
        ])->assertRedirect();

        $this->assertSame($me->id, Contact::first()->owner_id);
    }

    public function test_name_and_email_are_validated(): void
    {
        $this->actingAs($this->seller())
            ->post('/contactos', ['name' => '', 'email' => 'no-es-correo'])
            ->assertSessionHasErrors(['name', 'email']);
    }

    public function test_seller_only_sees_and_edits_own_contacts(): void
    {
        $me = $this->seller();
        $other = $this->seller('Otro');
        $mine = $this->contact($me, ['name' => 'Mío']);
        $theirs = $this->contact($other, ['name' => 'Ajeno']);

        $this->actingAs($me)->get('/contactos')->assertOk()
            ->assertInertia(fn (Assert $p) => $p->where('contacts.total', 1)->where('contacts.data.0.name', 'Mío'));

        $this->get("/contactos/{$theirs->id}/editar")->assertForbidden();
        $this->put("/contactos/{$theirs->id}", ['name' => 'X'])->assertForbidden();
        $this->delete("/contactos/{$theirs->id}")->assertForbidden();
        $this->get("/contactos/{$mine->id}/editar")->assertOk();

        $this->actingAs($this->admin())->get('/contactos')
            ->assertInertia(fn (Assert $p) => $p->where('contacts.total', 2));
    }

    public function test_cannot_link_contact_to_a_client_of_another_seller(): void
    {
        $me = $this->seller();
        $foreign = Client::create(['rfc' => 'AAA010101AAA', 'name' => 'Ajeno', 'seller_id' => $this->seller('Otro')->id]);

        $this->actingAs($me)->post('/contactos', ['name' => 'X', 'client_id' => $foreign->id])
            ->assertSessionHasErrors('client_id');
    }

    public function test_contact_changes_are_logged(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $c = $this->contact($admin);
        $c->update(['name' => 'Laura P.']);

        $this->assertTrue(ActivityLog::where('subject_type', 'contact')->where('action', 'updated')->exists());
    }

    public function test_attach_and_detach_contact_on_opportunity(): void
    {
        $me = $this->seller();
        $other = $this->seller('Otro');
        $opp = Opportunity::create(['name' => 'Op', 'owner_id' => $me->id, 'stage' => 'oportunidad', 'position' => 1]);
        $mine = $this->contact($me);
        $theirs = $this->contact($other, ['name' => 'Ajeno']);

        $this->actingAs($me)->post("/oportunidades/{$opp->id}/contactos", ['contact_id' => $mine->id, 'role' => 'Decisor'])->assertRedirect();
        $this->assertSame('Decisor', $opp->contacts()->first()->pivot->role);

        $this->post("/oportunidades/{$opp->id}/contactos", ['contact_id' => $theirs->id])->assertSessionHasErrors('contact_id');

        $this->get("/oportunidades/{$opp->id}")->assertInertia(fn (Assert $p) => $p
            ->has('contacts', 1)->where('contacts.0.role', 'Decisor'));

        $this->delete("/oportunidades/{$opp->id}/contactos/{$mine->id}")->assertRedirect();
        $this->assertSame(0, $opp->contacts()->count());
    }

    public function test_quote_contact_overrides_snapshot_and_follows_changes(): void
    {
        $me = $this->seller();
        $client = Client::create(['rfc' => 'AAA010101AAA', 'name' => 'Acme', 'contact' => 'Original', 'email' => 'orig@acme.mx', 'seller_id' => $me->id]);
        $contact = $this->contact($me, ['name' => 'Laura Pérez', 'email' => 'laura@acme.mx', 'client_id' => $client->id]);

        $payload = [
            'name' => 'Cot', 'date' => now()->toDateString(), 'delivery_unit' => 'dias',
            'delivery_days_min' => 1, 'delivery_days_max' => 5,
            'client_id' => $client->id, 'contact_id' => $contact->id,
            'currency' => 'MXN', 'exchange_rate' => 1, 'global_discount_type' => 'percentage', 'global_discount_value' => 0,
            'items' => [[
                'item_type' => 'producto', 'description' => 'Switch', 'quantity' => 1,
                'cost_unit_without_discount' => 100, 'discount_percent' => 0,
                'target_margin_percent' => 20, 'client_discount_percent' => 0,
            ]],
        ];

        $this->actingAs($me)->post('/cotizaciones', $payload)->assertSessionHasNoErrors();
        $q = Quote::firstOrFail();
        $this->assertSame($contact->id, $q->contact_id);
        $this->assertSame('Laura Pérez', $q->client_data['contact']);
        $this->assertSame('laura@acme.mx', $q->client_data['email']);

        // Quitar el contacto vuelve a los datos del cliente.
        $this->put("/cotizaciones/{$q->id}", array_merge($payload, ['contact_id' => null]))->assertSessionHasNoErrors();
        $q->refresh();
        $this->assertNull($q->contact_id);
        $this->assertSame('Original', $q->client_data['contact']);
        $this->assertSame('orig@acme.mx', $q->client_data['email']);
    }

    public function test_quote_rejects_contact_of_another_seller(): void
    {
        $me = $this->seller();
        $theirs = $this->contact($this->seller('Otro'));

        $this->actingAs($me)->post('/cotizaciones', ['contact_id' => $theirs->id])
            ->assertSessionHasErrors('contact_id');
    }

    public function test_search_finds_only_own_contacts(): void
    {
        $me = $this->seller();
        $this->contact($me, ['name' => 'Beatriz Mía']);
        $this->contact($this->seller('Otro'), ['name' => 'Beatriz Ajena']);

        $titles = collect($this->actingAs($me)->getJson('/buscar?q=Beatriz')->json('results'))
            ->where('type', 'contact')->pluck('title')->all();

        $this->assertSame(['Beatriz Mía'], $titles);
    }

    public function test_user_with_contacts_cannot_be_deleted(): void
    {
        $admin = $this->admin();
        $seller = $this->seller();
        $this->contact($seller);

        $this->actingAs($admin)->delete("/usuarios/{$seller->id}")->assertSessionHasErrors('user');
        $this->assertNotNull($seller->fresh());
    }

    public function test_picker_search_is_scoped_filtered_and_excludes(): void
    {
        $me = $this->seller();
        $a = $this->contact($me, ['name' => 'Ana Torres', 'company' => 'Zeta SA']);
        $b = $this->contact($me, ['name' => 'Beto Ruiz']);
        $this->contact($this->seller('Otro'), ['name' => 'Ana Ajena']);

        $names = fn ($url) => collect($this->actingAs($me)->getJson($url)->assertOk()->json('contacts'))->pluck('name')->all();

        $this->assertSame(['Ana Torres', 'Beto Ruiz'], $names('/contactos/buscar'));
        $this->assertSame(['Ana Torres'], $names('/contactos/buscar?q=zeta'));
        $this->assertSame(['Beto Ruiz'], $names("/contactos/buscar?exclude={$a->id}"));
        $this->assertSame([], $names('/contactos/buscar?q=%25'));
        $this->assertSame($b->name, $names('/contactos/buscar?q=Beto')[0]);
    }

    public function test_picker_search_requires_login(): void
    {
        $this->getJson('/contactos/buscar')->assertUnauthorized();
    }

    public function test_client_can_have_several_contacts_synced_on_save(): void
    {
        $me = $this->seller();
        $other = $this->seller('Otro');
        $a = $this->contact($me, ['name' => 'Ana']);
        $b = $this->contact($me, ['name' => 'Beto']);
        $foreign = $this->contact($other, ['name' => 'Ajeno']);

        $payload = ['rfc' => 'AAA010101AAA', 'name' => 'Acme'];

        $this->actingAs($me)->post('/clientes', $payload + ['contact_ids' => [$a->id, $b->id]])->assertRedirect();
        $client = Client::firstOrFail();
        $this->assertEqualsCanonicalizing([$a->id, $b->id], $client->contacts()->pluck('id')->all());

        // Al editar, los que ya no están en la lista se desligan (no se borran).
        $this->put("/clientes/{$client->id}", $payload + ['contact_ids' => [$b->id]])->assertRedirect();
        $this->assertSame([$b->id], $client->contacts()->pluck('id')->all());
        $this->assertNotNull($a->fresh());
        $this->assertNull($a->fresh()->client_id);

        // El formulario de edición los devuelve.
        $this->get("/clientes/{$client->id}/editar")->assertInertia(fn (Assert $p) => $p
            ->has('linkedContacts', 1)->where('linkedContacts.0.name', 'Beto'));

        // Contactos de otro vendedor se rechazan.
        $this->put("/clientes/{$client->id}", $payload + ['contact_ids' => [$foreign->id]])
            ->assertSessionHasErrors('contact_ids.0');

        // Sin contact_ids en la petición no se toca nada.
        $this->put("/clientes/{$client->id}", $payload)->assertRedirect();
        $this->assertSame([$b->id], $client->contacts()->pluck('id')->all());
    }
}
