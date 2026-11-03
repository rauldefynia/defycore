<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_user_can_upload_avatar_and_it_is_resized_square(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('foto.jpg', 800, 400)])
            ->assertRedirect();

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        Storage::disk('local')->assertExists($user->avatar_path);

        [$w, $h] = getimagesizefromstring(Storage::disk('local')->get($user->avatar_path));
        $this->assertSame([256, 256], [$w, $h]);

        $this->assertStringStartsWith("/avatars/{$user->id}?v=", $user->avatar);
        $this->get($user->avatar)->assertOk();
    }

    public function test_avatar_is_shared_with_the_frontend(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('a.png')]);

        $this->get('/settings/profile')->assertInertia(
            fn ($page) => $page->where('auth.user.avatar', $user->fresh()->avatar)
        );
    }

    public function test_replacing_avatar_deletes_the_previous_file(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('a.png')]);
        $first = $user->fresh()->avatar_path;

        $this->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('b.png')]);
        $second = $user->fresh()->avatar_path;

        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);
    }

    public function test_user_can_remove_avatar(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('a.png')]);
        $path = $user->fresh()->avatar_path;

        $this->delete('/settings/profile/avatar')->assertRedirect();

        $this->assertNull($user->fresh()->avatar_path);
        $this->assertNull($user->fresh()->avatar);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_rejects_non_images_and_oversized_files(): void
    {
        $this->actingAs(User::factory()->create());

        $this->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')])
            ->assertSessionHasErrors('avatar');

        $this->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('big.jpg')->size(5000)])
            ->assertSessionHasErrors('avatar');
    }

    public function test_guests_cannot_upload_or_view(): void
    {
        $user = User::factory()->create(['avatar_path' => 'avatars/x.webp']);

        $this->post('/settings/profile/avatar', [])->assertRedirect('/login');
        $this->get("/avatars/{$user->id}")->assertRedirect('/login');
    }
}
