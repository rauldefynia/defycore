<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CaptchaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['captcha.enabled' => true]);
    }

    /** Pide un reto y devuelve el id de la opción correcta (leyéndolo de la sesión de prueba). */
    private function solvedId(): string
    {
        $data = $this->getJson(route('captcha'))->assertOk()->json();
        $this->assertCount(4, $data['options']);
        $this->assertStringStartsWith('data:image/svg+xml', $data['image']);

        foreach ($data['options'] as $o) {
            if (hash_equals(
                session('captcha.challenge.hash'),
                hash_hmac('sha256', $o['id'], (string) config('app.key')),
            )) {
                return $o['id'];
            }
        }

        $this->fail('Ninguna opción coincide con el reto.');
    }

    public function test_login_without_captcha_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('captcha');

        $this->assertGuest();
    }

    public function test_login_with_wrong_captcha_is_rejected(): void
    {
        $user = User::factory()->create();
        $this->getJson(route('captcha'));
        $this->travel(3)->seconds();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password', 'captcha' => 'x'])
            ->assertSessionHasErrors('captcha');

        $this->assertGuest();
    }

    public function test_login_with_correct_captcha_succeeds(): void
    {
        $user = User::factory()->create();
        $id = $this->solvedId();
        $this->travel(3)->seconds();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password', 'captcha' => $id]);

        $this->assertAuthenticated();
    }

    public function test_captcha_is_single_use_and_too_fast_answers_fail(): void
    {
        $user = User::factory()->create();

        // Demasiado rápido (bot).
        $id = $this->solvedId();
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password', 'captcha' => $id])
            ->assertSessionHasErrors('captcha');

        // Un reto consumido no se puede reutilizar.
        $id = $this->solvedId();
        $this->travel(3)->seconds();
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'mala', 'captcha' => $id]);
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password', 'captcha' => $id])
            ->assertSessionHasErrors('captcha');

        $this->assertGuest();
    }
}
