<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Opportunity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HeaderTest extends TestCase
{
    use RefreshDatabase;

    private function seller(string $name = 'Vera'): User
    {
        return User::factory()->create(['role' => 'seller', 'active' => true, 'name' => $name]);
    }

    public function test_search_requires_login_and_two_chars(): void
    {
        $this->getJson('/buscar?q=ab')->assertUnauthorized();

        $this->actingAs($this->seller())->getJson('/buscar?q=a')->assertOk()->assertJson(['results' => []]);
    }

    public function test_seller_only_finds_own_records_and_never_users(): void
    {
        $me = $this->seller('Vera');
        $other = $this->seller('Otro');
        Client::create(['rfc' => 'AAA010101AAA', 'name' => 'Acme Mío', 'seller_id' => $me->id]);
        Client::create(['rfc' => 'BBB010101BBB', 'name' => 'Acme Ajeno', 'seller_id' => $other->id]);

        $res = $this->actingAs($me)->getJson('/buscar?q=Acme')->assertOk();

        $titles = collect($res->json('results'))->pluck('title');
        $this->assertSame(['Acme Mío'], $titles->all());

        $types = collect($this->actingAs($me)->getJson('/buscar?q=Otro')->json('results'))->pluck('type');
        $this->assertNotContains('user', $types->all());
    }

    public function test_admin_search_includes_users_and_escapes_wildcards(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'active' => true, 'name' => 'Ana Admin']);
        $this->seller('Zoe Vendedora');

        $types = collect($this->actingAs($admin)->getJson('/buscar?q=Zoe')->json('results'))->pluck('type');
        $this->assertContains('user', $types->all());

        $this->assertSame([], $this->actingAs($admin)->getJson('/buscar?q=%25%25')->json('results'));
    }

    public function test_notifications_show_only_own_due_items(): void
    {
        $me = $this->seller('Vera');
        $other = $this->seller('Otro');
        Opportunity::create(['name' => 'Vencida mía', 'owner_id' => $me->id, 'stage' => 'oportunidad', 'position' => 1, 'expected_close_date' => now()->subDay()->toDateString()]);
        Opportunity::create(['name' => 'Vencida ajena', 'owner_id' => $other->id, 'stage' => 'oportunidad', 'position' => 1, 'expected_close_date' => now()->subDay()->toDateString()]);
        Opportunity::create(['name' => 'Ganada', 'owner_id' => $me->id, 'stage' => 'ganado', 'position' => 1, 'expected_close_date' => now()->subDay()->toDateString()]);

        $items = $this->actingAs($me)->getJson('/notificaciones')->assertOk()->json('items');

        $this->assertCount(1, $items);
        $this->assertStringContainsString('Vencida mía', $items[0]['text']);
        $this->assertSame('danger', $items[0]['kind']);
    }

    public function test_admin_is_warned_about_failed_logins(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'active' => true]);
        ActivityLog::record('login_failed', 'user', null, 'x@y.mx');

        $items = $this->actingAs($admin)->getJson('/notificaciones')->json('items');

        $this->assertSame('Intentos de acceso fallidos', $items[0]['title']);
        $this->assertSame([], $this->actingAs($this->seller())->getJson('/notificaciones')->json('items'));
    }
}
