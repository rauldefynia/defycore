<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'active' => true, 'name' => 'Ana Admin']);
    }

    public function test_create_update_delete_are_logged_with_actor_and_diff(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);

        $client = Client::create(['rfc' => 'XAXX010101000', 'name' => 'Acme', 'seller_id' => $admin->id]);
        $client->update(['name' => 'Acme SA']);
        $client->delete();

        $logs = ActivityLog::orderBy('id')->where('subject_type', 'client')->get();
        $this->assertSame(['created', 'updated', 'deleted'], $logs->pluck('action')->all());
        $this->assertSame($admin->id, $logs[1]->user_id);
        $this->assertSame('Ana Admin', $logs[1]->user_name);
        $this->assertSame(['old' => 'Acme', 'new' => 'Acme SA'], $logs[1]->changes['name']);
    }

    public function test_secrets_are_never_stored(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);

        $admin->forceFill(['password' => 'otra-clave-123', 'microsoft_refresh_token' => 'SECRETO', 'phone' => '555'])->save();
        User::factory()->create(['name' => 'Nuevo']);

        $dump = ActivityLog::all()->toJson();
        $this->assertStringNotContainsString('SECRETO', $dump);
        $this->assertStringNotContainsString('"password"', $dump);
        $this->assertStringNotContainsString('remember_token', $dump);
        $this->assertTrue(ActivityLog::where('action', 'updated')->get()->contains(fn ($l) => isset($l->changes['phone'])));
    }

    public function test_only_ignored_fields_changing_logs_nothing(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        ActivityLog::query()->delete();

        $admin->forceFill(['microsoft_access_token' => 'x', 'microsoft_token_expires_at' => now()])->save();

        $this->assertSame(0, ActivityLog::count());
    }

    public function test_console_without_session_is_not_logged(): void
    {
        Client::create(['rfc' => 'XAXX010101000', 'name' => 'Seeder']);

        $this->assertSame(0, ActivityLog::count());
    }

    public function test_login_logout_and_failed_login_are_logged(): void
    {
        $user = User::factory()->create(['role' => 'seller', 'active' => true]);

        $this->post('/login', ['email' => $user->email, 'password' => 'mala']);
        $this->assertTrue(ActivityLog::where('action', 'login_failed')->where('subject_label', $user->email)->exists());

        $this->post('/login', ['email' => $user->email, 'password' => 'password']);
        $this->assertTrue(ActivityLog::where('action', 'login')->where('user_id', $user->id)->exists());

        $this->post('/logout');
        $this->assertTrue(ActivityLog::where('action', 'logout')->where('user_id', $user->id)->exists());
    }

    public function test_only_admin_can_view_and_filter(): void
    {
        $admin = $this->admin();
        $seller = User::factory()->create(['role' => 'seller', 'active' => true]);

        $this->actingAs($admin);
        Client::create(['rfc' => 'XAXX010101000', 'name' => 'Visible', 'seller_id' => $admin->id]);

        $this->get('/bitacora')->assertOk()->assertInertia(fn (Assert $p) => $p
            ->component('activity/index')
            ->where('logs.total', fn ($t) => $t >= 1));

        $this->get('/bitacora?action=deleted')->assertOk()
            ->assertInertia(fn (Assert $p) => $p->where('logs.total', 0));

        $this->get('/bitacora?search=Visible&subject=client&from=2000-01-01')->assertOk()
            ->assertInertia(fn (Assert $p) => $p->where('logs.total', 1));

        $this->actingAs($seller)->get('/bitacora')->assertForbidden();
        auth()->logout();
        $this->get('/bitacora')->assertRedirect('/login');
    }
}
