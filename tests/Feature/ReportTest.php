<?php

namespace Tests\Feature;

use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private function quote(User $seller, array $over = []): Quote
    {
        return Quote::create(array_merge([
            'number' => 'PRE-'.uniqid(),
            'name' => 'Cotización',
            'date' => now()->toDateString(),
            'seller_id' => $seller->id,
            'currency' => 'MXN',
            'exchange_rate' => 1,
            'total' => 1000,
            'summary_sale_total' => 1000,
            'summary_profit' => 250,
            'client_data' => ['name' => 'Acme'],
        ], $over));
    }

    public function test_requires_authentication(): void
    {
        $this->get('/graficas')->assertRedirect('/login');
    }

    public function test_seller_sees_only_own_data_and_no_ranking(): void
    {
        $a = User::factory()->create(['role' => 'seller']);
        $b = User::factory()->create(['role' => 'seller']);
        $this->quote($a, ['total' => 1000]);
        $this->quote($b, ['total' => 5000, 'summary_sale_total' => 5000]);

        $this->actingAs($a)->get('/graficas?period=30d')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('reports/index')
                ->where('kpis.current.quoted', 1000)
                ->where('kpis.current.quotes', 1)
                ->where('kpis.current.margin', 25)
                ->where('sellers', null)
                ->where('options.sellers', []));
    }

    public function test_admin_sees_everything_and_can_filter_by_seller(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $a = User::factory()->create(['role' => 'seller']);
        $b = User::factory()->create(['role' => 'seller']);
        $this->quote($a, ['total' => 1000]);
        $this->quote($b, ['total' => 5000, 'summary_sale_total' => 5000]);

        $this->actingAs($admin)->get('/graficas?period=30d')
            ->assertInertia(fn ($p) => $p->where('kpis.current.quoted', 6000)->has('sellers', 2));

        $this->actingAs($admin)->get('/graficas?period=30d&seller='.$b->id)
            ->assertInertia(fn ($p) => $p->where('kpis.current.quoted', 5000)->where('filters.seller', $b->id));
    }

    public function test_converts_to_mxn_and_computes_win_rate_and_forecast(): void
    {
        $u = User::factory()->create(['role' => 'admin']);
        $this->quote($u, ['currency' => 'USD', 'exchange_rate' => 20, 'total' => 100, 'total_mxn_equivalent' => 2000]);
        Opportunity::create(['name' => 'G', 'owner_id' => $u->id, 'stage' => 'ganado', 'estimated_amount' => 3000, 'closed_at' => now()]);
        Opportunity::create(['name' => 'P', 'owner_id' => $u->id, 'stage' => 'perdido', 'estimated_amount' => 500, 'closed_at' => now(), 'lost_reason' => 'Precio']);
        Opportunity::create(['name' => 'A', 'owner_id' => $u->id, 'stage' => 'presentado', 'estimated_amount' => 4000]);

        $this->actingAs($u)->get('/graficas?period=30d')
            ->assertInertia(fn ($p) => $p
                ->where('kpis.current.quoted', 2000)
                ->where('kpis.current.won', 3000)
                ->where('kpis.current.win_rate', 50)
                ->where('kpis.pipeline_open', 4000)
                ->where('kpis.pipeline_weighted', 3000)
                ->where('lostReasons.0.reason', 'Precio'));
    }

    public function test_custom_period_is_respected_and_invalid_falls_back(): void
    {
        $u = User::factory()->create(['role' => 'admin']);

        $this->actingAs($u)->get('/graficas?period=custom&from=2026-01-01&to=2026-01-31')
            ->assertInertia(fn ($p) => $p->where('range.days', 31)->where('filters.period', 'custom'));

        $this->actingAs($u)->get('/graficas?period=custom&from=basura&to=x')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->where('filters.period', '90d'));
    }

    public function test_exports_pdf_with_filters_and_sections(): void
    {
        $u = User::factory()->create(['role' => 'admin']);
        $this->quote($u);
        Opportunity::create(['name' => 'G', 'owner_id' => $u->id, 'stage' => 'ganado', 'estimated_amount' => 3000, 'closed_at' => now()]);

        $res = $this->actingAs($u)->get('/graficas/exportar?period=30d&title=Cierre+Q4&sections[]=kpis&sections[]=trend&sections[]=funnel&sections[]=outcome&sections[]=margin&sections[]=currencies&sections[]=clients&sections[]=forecast&sections[]=open&sections[]=sellers');

        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $res->getContent());
    }

    public function test_export_requires_authentication_and_handles_empty_data(): void
    {
        $this->get('/graficas/exportar')->assertRedirect('/login');

        $seller = User::factory()->create(['role' => 'seller']);
        $this->actingAs($seller)->get('/graficas/exportar?sections[]=sellers&sections[]=nope')->assertOk();
    }

    public function test_pdf_has_no_blank_page_after_cover(): void
    {
        $u = User::factory()->create(['role' => 'admin']);

        $res = $this->actingAs($u)->get('/graficas/exportar?period=30d&sections[]=kpis');

        preg_match_all('#/Count (\d+)#', $res->getContent(), $m);
        // Portada + una hoja de contenido
        $this->assertSame(2, max(array_map('intval', $m[1])));
    }
}
