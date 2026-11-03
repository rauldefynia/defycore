<?php

namespace Tests\Feature;

use App\Models\Quote;
use App\Models\QuoteEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class MicrosoftTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.microsoft.client_id' => 'client-id',
            'services.microsoft.client_secret' => 'secret',
            'services.microsoft.tenant' => 'mi-tenant-guid',
            'services.microsoft.redirect' => 'http://localhost/auth/microsoft/callback',
            'services.microsoft.allowed_domains' => [],
        ]);
    }

    /** Simula Entra ID y Graph. */
    private function fakeMicrosoft(string $oid = 'oid-123', string $email = 'laura@heimtech.mx', int $sendStatus = 202): void
    {
        Http::fake([
            'login.microsoftonline.com/*' => Http::response([
                'access_token' => 'AT-new', 'refresh_token' => 'RT-new', 'expires_in' => 3600,
            ]),
            'graph.microsoft.com/v1.0/me/sendMail' => Http::response(
                $sendStatus === 202 ? '' : ['error' => ['message' => 'boom']], $sendStatus
            ),
            'graph.microsoft.com/v1.0/me*' => Http::response([
                'id' => $oid, 'displayName' => 'Laura', 'mail' => $email, 'userPrincipalName' => $email,
            ]),
        ]);
    }

    /** Recorre redirect → callback; devuelve la respuesta del callback. */
    private function runFlow(array $callback = []): TestResponse
    {
        $this->get('/auth/microsoft/redirect')->assertRedirect();
        $state = session('microsoft.state');

        return $this->get('/auth/microsoft/callback?'.http_build_query($callback + ['code' => 'the-code', 'state' => $state]));
    }

    private function connected(User $user): User
    {
        $user->forceFill([
            'microsoft_id' => 'oid-123', 'microsoft_email' => $user->email,
            'microsoft_access_token' => 'AT-old', 'microsoft_refresh_token' => 'RT-old',
            'microsoft_token_expires_at' => now()->addHour(),
        ])->save();

        return $user;
    }

    private function makeQuote(User $user): Quote
    {
        $this->actingAs($user)->post('/cotizaciones', [
            'name' => 'Cot', 'date' => '2026-11-03', 'delivery_unit' => 'dias', 'currency' => 'MXN',
            'global_discount_type' => 'percentage',
            'items' => [['item_type' => 'producto', 'description' => 'X', 'quantity' => 1, 'cost_unit_without_discount' => 100, 'target_margin_percent' => 20]],
        ]);

        return Quote::latest('id')->firstOrFail();
    }

    // ---------------------------------------------------------------- autenticación

    public function test_redirect_builds_authorization_url_with_pkce_state_and_scopes(): void
    {
        $r = $this->get('/auth/microsoft/redirect');
        $location = $r->headers->get('Location');

        $this->assertStringStartsWith('https://login.microsoftonline.com/mi-tenant-guid/oauth2/v2.0/authorize?', $location);
        parse_str(parse_url($location, PHP_URL_QUERY), $q);

        $this->assertSame('client-id', $q['client_id']);
        $this->assertSame('code', $q['response_type']);
        $this->assertSame('S256', $q['code_challenge_method']);
        $this->assertSame(session('microsoft.state'), $q['state']);
        $this->assertStringContainsString('Mail.Send', $q['scope']);
        $this->assertStringContainsString('offline_access', $q['scope']);

        // El challenge corresponde al verifier guardado en sesión
        $expected = rtrim(strtr(base64_encode(hash('sha256', session('microsoft.verifier'), true)), '+/', '-_'), '=');
        $this->assertSame($expected, $q['code_challenge']);
    }

    public function test_not_configured_shows_error_instead_of_redirecting(): void
    {
        config(['services.microsoft.client_id' => null]);

        $this->get('/auth/microsoft/redirect')->assertRedirect('/login')->assertSessionHasErrors('email');
    }

    public function test_existing_user_logs_in_and_tokens_are_stored_encrypted(): void
    {
        $user = User::factory()->create(['email' => 'laura@heimtech.mx']);
        $this->fakeMicrosoft();

        $this->runFlow()->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
        $user->refresh();
        $this->assertSame('oid-123', $user->microsoft_id);
        $this->assertSame('AT-new', $user->microsoft_access_token);
        $this->assertSame('RT-new', $user->microsoft_refresh_token);
        $this->assertTrue($user->microsoft_connected);

        // Cifrado en la base de datos
        $raw = \DB::table('users')->where('id', $user->id)->value('microsoft_refresh_token');
        $this->assertNotSame('RT-new', $raw);

        // Sin enviar tokens al navegador
        $this->get('/dashboard')->assertInertia(fn ($p) => $p
            ->where('auth.user.microsoft_connected', true)
            ->missing('auth.user.microsoft_access_token')
            ->missing('auth.user.microsoft_refresh_token'));
    }

    public function test_unknown_microsoft_account_is_rejected_and_no_user_is_created(): void
    {
        User::factory()->create(['email' => 'otro@heimtech.mx']);
        $this->fakeMicrosoft(email: 'desconocido@heimtech.mx');

        $this->runFlow()->assertRedirect('/login')->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertSame(1, User::count());
    }

    public function test_inactive_user_cannot_login_with_microsoft(): void
    {
        User::factory()->inactive()->create(['email' => 'laura@heimtech.mx']);
        $this->fakeMicrosoft();

        $this->runFlow()->assertRedirect('/login')->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_state_mismatch_is_rejected_without_calling_microsoft(): void
    {
        User::factory()->create(['email' => 'laura@heimtech.mx']);
        $this->fakeMicrosoft();

        $this->get('/auth/microsoft/redirect');
        $this->get('/auth/microsoft/callback?code=x&state=FORGED')
            ->assertRedirect('/login')->assertSessionHasErrors('email');

        $this->assertGuest();
        Http::assertNothingSent();
    }

    public function test_callback_without_prior_redirect_is_rejected(): void
    {
        $this->get('/auth/microsoft/callback?code=x&state=y')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_user_denying_consent_gets_a_friendly_error(): void
    {
        $this->get('/auth/microsoft/redirect');
        $this->get('/auth/microsoft/callback?error=access_denied&state='.session('microsoft.state'))
            ->assertRedirect('/login')->assertSessionHasErrors('email');
    }

    public function test_generic_tenant_never_links_by_email_but_allows_already_linked_accounts(): void
    {
        config(['services.microsoft.tenant' => 'common']);
        $victim = User::factory()->create(['email' => 'laura@heimtech.mx']);
        $this->fakeMicrosoft(oid: 'attacker-oid', email: 'laura@heimtech.mx'); // otro tenant declara su correo

        $this->runFlow()->assertRedirect('/login');
        $this->assertGuest();
        $this->assertNull($victim->fresh()->microsoft_id);

        // En cambio, una cuenta ya vinculada por su id sí entra
        $victim->forceFill(['microsoft_id' => 'oid-ok'])->save();
        // Descarta los stubs anteriores (el primero que coincide gana).
        $this->app->forgetInstance(Factory::class);
        Http::clearResolvedInstances();
        $this->fakeMicrosoft(oid: 'oid-ok', email: 'cualquiera@x.com');
        $this->runFlow()->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($victim);
    }

    public function test_account_linked_to_another_microsoft_id_is_not_taken_over_by_email(): void
    {
        User::factory()->create(['email' => 'laura@heimtech.mx', 'microsoft_id' => 'oid-real']);
        $this->fakeMicrosoft(oid: 'oid-impostor', email: 'laura@heimtech.mx');

        $this->runFlow()->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_allowed_domains_restricts_access(): void
    {
        config(['services.microsoft.allowed_domains' => ['heimtech.mx']]);
        User::factory()->create(['email' => 'laura@gmail.com']);
        $this->fakeMicrosoft(email: 'laura@gmail.com');

        $this->runFlow()->assertRedirect('/login')->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_logged_in_user_can_link_and_disconnect(): void
    {
        $user = User::factory()->create(['email' => 'laura@sistema.mx']);
        $this->fakeMicrosoft(email: 'laura@heimtech.mx'); // correo distinto: al vincular no se exige igualdad

        $this->actingAs($user);
        $this->runFlow()->assertRedirect('/settings/profile');

        $user->refresh();
        $this->assertSame('oid-123', $user->microsoft_id);
        $this->assertSame('laura@heimtech.mx', $user->microsoft_email);

        $this->delete('/auth/microsoft')->assertRedirect();
        $user->refresh();
        $this->assertNull($user->microsoft_id);
        $this->assertNull($user->microsoft_refresh_token);
        $this->assertFalse($user->microsoft_connected);
    }

    public function test_cannot_link_an_account_already_used_by_another_user(): void
    {
        User::factory()->create(['microsoft_id' => 'oid-123']);
        $me = User::factory()->create();
        $this->fakeMicrosoft();

        $this->actingAs($me);
        $this->runFlow()->assertRedirect('/settings/profile');
        $this->assertNull($me->fresh()->microsoft_id);
    }

    public function test_microsoft_enabled_flag_is_shared(): void
    {
        $this->get('/login')->assertInertia(fn ($p) => $p->where('microsoftEnabled', true));

        config(['services.microsoft.client_secret' => null]);
        $this->get('/login')->assertInertia(fn ($p) => $p->where('microsoftEnabled', false));
    }

    // ---------------------------------------------------------------- envío de correo

    private function payload(array $over = []): array
    {
        return $over + [
            'to' => 'cliente@empresa.com, otro@empresa.com',
            'cc' => 'jefe@heimtech.mx',
            'subject' => 'Cotización PRE-1',
            'message' => "Hola,\nAdjunto la cotización.",
            'attachment' => 'client_mxn',
        ];
    }

    public function test_sends_quote_by_graph_with_pdf_attachment_and_logs_it(): void
    {
        $user = $this->connected(User::factory()->create());
        $quote = $this->makeQuote($user);
        $this->fakeMicrosoft();

        $this->post("/cotizaciones/{$quote->id}/enviar", $this->payload())->assertRedirect();

        Http::assertSent(function (HttpRequest $r) {
            if (! str_ends_with($r->url(), '/me/sendMail')) {
                return false;
            }
            $m = $r['message'];

            return $r->hasHeader('Authorization', 'Bearer AT-old')
                && $m['subject'] === 'Cotización PRE-1'
                && $m['body']['contentType'] === 'HTML'
                && count($m['toRecipients']) === 2
                && $m['toRecipients'][0]['emailAddress']['address'] === 'cliente@empresa.com'
                && $m['ccRecipients'][0]['emailAddress']['address'] === 'jefe@heimtech.mx'
                && $m['attachments'][0]['@odata.type'] === '#microsoft.graph.fileAttachment'
                && str_ends_with($m['attachments'][0]['name'], '-client_mxn.pdf')
                && str_starts_with(base64_decode($m['attachments'][0]['contentBytes']), '%PDF')
                && $r['saveToSentItems'] === true;
        });

        $log = QuoteEmail::firstOrFail();
        $this->assertSame($quote->id, $log->quote_id);
        $this->assertSame(['cliente@empresa.com', 'otro@empresa.com'], $log->to);
        $this->get("/cotizaciones/{$quote->id}/editar")->assertInertia(fn ($p) => $p->has('emails', 1));
    }

    public function test_can_send_without_attachment_and_message_is_html_escaped(): void
    {
        $user = $this->connected(User::factory()->create());
        $quote = $this->makeQuote($user);
        $this->fakeMicrosoft();

        $this->post("/cotizaciones/{$quote->id}/enviar", $this->payload([
            'attachment' => 'none', 'message' => '<script>alert(1)</script>',
        ]))->assertRedirect();

        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/me/sendMail')
            && ! isset($r['message']['attachments'])
            && str_contains($r['message']['body']['content'], '&lt;script&gt;')
            && ! str_contains($r['message']['body']['content'], '<script>'));
    }

    public function test_expired_token_is_refreshed_before_sending(): void
    {
        $user = $this->connected(User::factory()->create());
        $user->forceFill(['microsoft_token_expires_at' => now()->subMinute()])->save();
        $quote = $this->makeQuote($user);
        $this->fakeMicrosoft();

        $this->post("/cotizaciones/{$quote->id}/enviar", $this->payload())->assertRedirect();

        Http::assertSent(fn (HttpRequest $r) => str_contains($r->url(), '/oauth2/v2.0/token') && $r['grant_type'] === 'refresh_token' && $r['refresh_token'] === 'RT-old');
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/me/sendMail') && $r->hasHeader('Authorization', 'Bearer AT-new'));
        $this->assertSame('RT-new', $user->fresh()->microsoft_refresh_token);
    }

    public function test_revoked_refresh_token_disconnects_and_reports_error(): void
    {
        $user = $this->connected(User::factory()->create());
        $user->forceFill(['microsoft_token_expires_at' => now()->subMinute()])->save();
        $quote = $this->makeQuote($user);
        Http::fake(['login.microsoftonline.com/*' => Http::response(['error' => 'invalid_grant', 'error_description' => 'revoked'], 400)]);

        $this->post("/cotizaciones/{$quote->id}/enviar", $this->payload())->assertSessionHasErrors('mail');

        $this->assertFalse($user->fresh()->microsoft_connected);
        $this->assertSame(0, QuoteEmail::count());
    }

    public function test_graph_401_is_retried_once_with_a_refreshed_token(): void
    {
        $user = $this->connected(User::factory()->create());
        $quote = $this->makeQuote($user);
        Http::fake([
            'login.microsoftonline.com/*' => Http::response(['access_token' => 'AT-new', 'refresh_token' => 'RT-new', 'expires_in' => 3600]),
            'graph.microsoft.com/v1.0/me/sendMail' => Http::sequence()->push('', 401)->push('', 202),
        ]);

        $this->post("/cotizaciones/{$quote->id}/enviar", $this->payload())->assertSessionHasNoErrors();
        $this->assertSame(1, QuoteEmail::count());
    }

    public function test_missing_mail_send_permission_gives_a_clear_error(): void
    {
        $user = $this->connected(User::factory()->create());
        $quote = $this->makeQuote($user);
        $this->fakeMicrosoft(sendStatus: 403);

        $this->post("/cotizaciones/{$quote->id}/enviar", $this->payload())->assertSessionHasErrors('mail');
        $this->assertStringContainsString('Mail.Send', session('errors')->first('mail'));
        $this->assertSame(0, QuoteEmail::count());
    }

    public function test_user_without_microsoft_cannot_send(): void
    {
        $user = User::factory()->create();
        $quote = $this->makeQuote($user);
        Http::fake();

        $this->post("/cotizaciones/{$quote->id}/enviar", $this->payload())->assertSessionHasErrors('mail');
        Http::assertNothingSent();
    }

    public function test_validation_rejects_bad_emails_internal_pdf_and_too_many_recipients(): void
    {
        $user = $this->connected(User::factory()->create());
        $quote = $this->makeQuote($user);
        Http::fake();

        $url = "/cotizaciones/{$quote->id}/enviar";
        $this->post($url, $this->payload(['to' => 'no-es-correo']))->assertSessionHasErrors('to');
        $this->post($url, $this->payload(['to' => '']))->assertSessionHasErrors('to');
        $this->post($url, $this->payload(['cc' => 'bad@']))->assertSessionHasErrors('cc');
        $this->post($url, $this->payload(['attachment' => 'internal']))->assertSessionHasErrors('attachment');
        $this->post($url, $this->payload(['to' => implode(',', array_map(fn ($i) => "u{$i}@x.com", range(1, 11)))]))->assertSessionHasErrors('to');
        $this->post($url, $this->payload(['subject' => '']))->assertSessionHasErrors('subject');

        Http::assertNothingSent();
    }

    public function test_cannot_send_someone_elses_quote(): void
    {
        $owner = User::factory()->create();
        $quote = $this->makeQuote($owner);
        $other = $this->connected(User::factory()->create());
        Http::fake();

        $this->actingAs($other)->post("/cotizaciones/{$quote->id}/enviar", $this->payload())->assertForbidden();
        Http::assertNothingSent();
    }
}
