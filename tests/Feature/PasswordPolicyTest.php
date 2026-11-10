<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function payload(array $over = []): array
    {
        return array_merge([
            'name' => 'Nuevo Usuario',
            'email' => 'nuevo@empresa.mx',
            'role' => 'seller',
            'active' => true,
            'password' => 'Clave-Temporal-91',
            'password_confirmation' => 'Clave-Temporal-91',
        ], $over);
    }

    public function test_admin_creates_user_with_policy_options(): void
    {
        $this->actingAs($this->admin())->post('/usuarios', $this->payload([
            'must_change_password' => true,
            'password_expires' => true,
            'password_expiry_days' => 30,
        ]))->assertRedirect();

        $u = User::where('email', 'nuevo@empresa.mx')->first();
        $this->assertTrue($u->must_change_password);
        $this->assertSame(30, $u->password_expiry_days);
        $this->assertNotNull($u->password_changed_at);
    }

    public function test_options_off_by_default_and_expiry_days_required_when_enabled(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/usuarios', $this->payload())->assertRedirect();
        $u = User::where('email', 'nuevo@empresa.mx')->first();
        $this->assertFalse($u->must_change_password);
        $this->assertNull($u->password_expiry_days);

        $this->actingAs($admin)->post('/usuarios', $this->payload(['email' => 'otro@empresa.mx', 'password_expires' => true]))
            ->assertSessionHasErrors('password_expiry_days');
    }

    public function test_user_with_flag_is_redirected_until_password_changed(): void
    {
        $u = User::factory()->create(['must_change_password' => true, 'password' => 'Temporal-12345']);

        $this->actingAs($u)->get('/dashboard')->assertRedirect('/cambiar-contrasena');
        $this->actingAs($u)->get('/cambiar-contrasena')->assertOk();

        $this->actingAs($u)->put('/cambiar-contrasena', [
            'current_password' => 'Temporal-12345',
            'password' => 'Mi-Nueva-Clave-77',
            'password_confirmation' => 'Mi-Nueva-Clave-77',
        ])->assertRedirect('/dashboard');

        $u->refresh();
        $this->assertFalse($u->must_change_password);
        $this->actingAs($u)->get('/dashboard')->assertOk();
    }

    public function test_wrong_current_or_same_password_is_rejected(): void
    {
        $u = User::factory()->create(['must_change_password' => true, 'password' => 'Temporal-12345']);

        $this->actingAs($u)->put('/cambiar-contrasena', [
            'current_password' => 'incorrecta',
            'password' => 'Mi-Nueva-Clave-77',
            'password_confirmation' => 'Mi-Nueva-Clave-77',
        ])->assertSessionHasErrors('current_password');

        $this->actingAs($u)->put('/cambiar-contrasena', [
            'current_password' => 'Temporal-12345',
            'password' => 'Temporal-12345',
            'password_confirmation' => 'Temporal-12345',
        ])->assertSessionHasErrors('password');

        $this->assertTrue($u->fresh()->must_change_password);
    }

    public function test_expired_password_forces_change_and_unexpired_does_not(): void
    {
        $expired = User::factory()->create(['password_expiry_days' => 30, 'password_changed_at' => now()->subDays(31)]);
        $valid = User::factory()->create(['password_expiry_days' => 30, 'password_changed_at' => now()->subDays(5)]);
        $never = User::factory()->create(['password_expiry_days' => null, 'password_changed_at' => now()->subYears(3)]);

        $this->actingAs($expired)->get('/dashboard')->assertRedirect('/cambiar-contrasena');
        $this->actingAs($valid)->get('/dashboard')->assertOk();
        $this->actingAs($never)->get('/dashboard')->assertOk();
    }

    public function test_user_without_requirement_cannot_use_forced_screen(): void
    {
        $this->actingAs(User::factory()->create())->get('/cambiar-contrasena')->assertRedirect('/dashboard');
    }

    public function test_microsoft_session_skips_forced_change(): void
    {
        $u = User::factory()->create(['must_change_password' => true]);

        $this->actingAs($u)->withSession(['auth_via_microsoft' => true])->get('/dashboard')->assertOk();
    }

    public function test_admin_can_set_flag_when_editing(): void
    {
        $admin = $this->admin();
        $u = User::factory()->create(['role' => 'seller']);

        $this->actingAs($admin)->put("/usuarios/{$u->id}", [
            'name' => $u->name, 'email' => $u->email, 'role' => 'seller', 'active' => true,
            'must_change_password' => true, 'password_expires' => true, 'password_expiry_days' => 60,
        ])->assertRedirect();

        $u->refresh();
        $this->assertTrue($u->must_change_password);
        $this->assertSame(60, $u->password_expiry_days);
    }
}
