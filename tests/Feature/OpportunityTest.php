<?php

namespace Tests\Feature;

use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpportunityTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    private function makeQuote(array $over = []): Quote
    {
        $this->post('/cotizaciones', array_merge([
            'name' => 'Cotización', 'date' => '2026-11-03', 'delivery_unit' => 'dias',
            'currency' => 'MXN', 'global_discount_type' => 'percentage',
            'items' => [[
                'item_type' => 'producto', 'description' => 'X', 'quantity' => 1,
                'cost_unit_without_discount' => 100, 'target_margin_percent' => 20,
            ]],
        ], $over))->assertRedirect();

        return Quote::latest('id')->firstOrFail();
    }

    private function makeOpp(string $name = 'Opp', string $stage = 'oportunidad', int $pos = 1): Opportunity
    {
        return Opportunity::create([
            'name' => $name, 'owner_id' => $this->user->id, 'stage' => $stage, 'position' => $pos,
        ]);
    }

    public function test_pipeline_and_create(): void
    {
        $this->get('/oportunidades')->assertOk();

        $this->post('/oportunidades', ['name' => 'Enlace dedicado', 'estimated_amount' => 5000])->assertRedirect();
        $opp = Opportunity::firstOrFail();
        $this->assertSame('oportunidad', $opp->stage);
        $this->assertSame(5000.0, $opp->estimated_amount);

        $this->get("/oportunidades/{$opp->id}")->assertOk();
    }

    public function test_move_between_stages_and_reorder(): void
    {
        $a = $this->makeOpp('A', 'oportunidad', 1);
        $b = $this->makeOpp('B', 'oportunidad', 2);
        $c = $this->makeOpp('C', 'calificado', 1);

        // A pasa a calificado antes de C
        $this->patch("/oportunidades/{$a->id}/mover", ['stage' => 'calificado', 'before_id' => $c->id])->assertRedirect();
        $this->assertSame('calificado', $a->fresh()->stage);
        $this->assertSame(1, $a->fresh()->position);
        $this->assertSame(2, $c->fresh()->position);

        // Ganado fija closed_at; volver a abrir lo limpia
        $this->patch("/oportunidades/{$b->id}/mover", ['stage' => 'ganado'])->assertRedirect();
        $this->assertNotNull($b->fresh()->closed_at);
        $this->patch("/oportunidades/{$b->id}/mover", ['stage' => 'presentado']);
        $this->assertNull($b->fresh()->closed_at);
    }

    public function test_lost_requires_reason(): void
    {
        $o = $this->makeOpp();

        $this->patch("/oportunidades/{$o->id}/mover", ['stage' => 'perdido'])
            ->assertSessionHasErrors('lost_reason');
        $this->assertSame('oportunidad', $o->fresh()->stage);

        $this->patch("/oportunidades/{$o->id}/mover", ['stage' => 'perdido', 'lost_reason' => 'Precio'])->assertRedirect();
        $this->assertSame('Precio', $o->fresh()->lost_reason);

        $this->patch("/oportunidades/{$o->id}/mover", ['stage' => 'calificado']);
        $this->assertNull($o->fresh()->lost_reason);
    }

    public function test_convert_quote_to_opportunity(): void
    {
        $quote = $this->makeQuote();

        $this->post("/cotizaciones/{$quote->id}/oportunidad")->assertRedirect();
        $opp = Opportunity::firstOrFail();

        $this->assertSame($opp->id, $quote->fresh()->opportunity_id);
        $this->assertTrue($quote->fresh()->active_with_client);
        $this->assertSame($quote->name, $opp->name);

        // No duplica
        $this->post("/cotizaciones/{$quote->id}/oportunidad")->assertRedirect("/oportunidades/{$opp->id}");
        $this->assertSame(1, Opportunity::count());
    }

    public function test_attach_detach_and_single_active_quote(): void
    {
        $opp = $this->makeOpp();
        $q1 = $this->makeQuote(['name' => 'V1']);
        $q2 = $this->makeQuote(['name' => 'V2']);

        $this->post("/oportunidades/{$opp->id}/cotizaciones", ['quote_id' => $q1->id]);
        $this->post("/oportunidades/{$opp->id}/cotizaciones", ['quote_id' => $q2->id]);

        $this->assertTrue($q1->fresh()->active_with_client);   // la primera es vigente
        $this->assertFalse($q2->fresh()->active_with_client);

        $this->post("/oportunidades/{$opp->id}/cotizaciones/{$q2->id}/vigente");
        $this->assertFalse($q1->fresh()->active_with_client);
        $this->assertTrue($q2->fresh()->active_with_client);

        // Desanexar la vigente pasa la vigencia a la restante
        $this->delete("/oportunidades/{$opp->id}/cotizaciones/{$q2->id}");
        $this->assertNull($q2->fresh()->opportunity_id);
        $this->assertTrue($q1->fresh()->active_with_client);
    }

    public function test_opportunity_value_uses_active_quote_in_mxn(): void
    {
        $opp = $this->makeOpp();
        $q = $this->makeQuote(['currency' => 'USD', 'exchange_rate' => 20, 'opportunity_id' => $opp->id]);

        $this->assertSame($opp->id, $q->opportunity_id);
        $opp->load('quotes');
        $v = $opp->value();
        $this->assertSame('USD', $v['currency']);
        $this->assertSame(round($q->total * 20, 2), $v['amount_mxn']);
    }

    public function test_quote_form_can_link_opportunity_and_inherits_defaults(): void
    {
        $opp = Opportunity::create(['name' => 'Opp X', 'owner_id' => $this->user->id]);

        $this->get("/cotizaciones/nueva?opportunity={$opp->id}")->assertOk()
            ->assertInertia(fn ($p) => $p->where('defaults.opportunity_id', $opp->id)->where('defaults.name', 'Opp X'));

        $q = $this->makeQuote(['opportunity_id' => $opp->id]);
        $this->assertTrue($q->active_with_client);
    }

    public function test_delete_keeps_quotes_and_other_users_are_blocked(): void
    {
        $opp = $this->makeOpp();
        $q = $this->makeQuote(['opportunity_id' => $opp->id]);

        $other = User::factory()->create();
        $this->actingAs($other)->get("/oportunidades/{$opp->id}")->assertForbidden();
        $this->patch("/oportunidades/{$opp->id}/mover", ['stage' => 'ganado'])->assertForbidden();

        // No puede ligar cotizaciones a oportunidades ajenas
        $this->actingAs($other)->post('/cotizaciones', [
            'name' => 'Z', 'date' => '2026-11-03', 'delivery_unit' => 'dias', 'currency' => 'MXN',
            'global_discount_type' => 'percentage', 'opportunity_id' => $opp->id,
            'items' => [['item_type' => 'producto', 'description' => 'X', 'quantity' => 1, 'cost_unit_without_discount' => 1]],
        ])->assertSessionHasErrors('opportunity_id');

        $this->actingAs($this->user)->delete("/oportunidades/{$opp->id}")->assertRedirect('/oportunidades');
        $this->assertNull($q->fresh()->opportunity_id);
        $this->assertSame(1, Quote::count());
    }
}
