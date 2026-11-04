<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WelcomeTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_user_is_not_welcomed_until_dismissed(): void
    {
        $user = User::factory()->create(['role' => 'seller', 'active' => true]);
        $this->assertNull($user->welcomed_at);

        $this->actingAs($user)->post('/bienvenida')->assertRedirect();

        $this->assertNotNull($user->fresh()->welcomed_at);
        $this->assertFalse(ActivityLog::where('action', 'updated')->exists());
    }

    public function test_guest_cannot_dismiss(): void
    {
        $this->post('/bienvenida')->assertRedirect('/login');
    }
}
