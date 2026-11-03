<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Issuer;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use App\Services\QuoteCalculator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Datos de prueba del flujo comercial: oportunidades en el pipeline con sus cotizaciones.
 * Requiere SellerUserSeeder, IssuerSeeder y ClientSeeder (DatabaseSeeder los llama antes).
 * Es idempotente: cada cotización se identifica por su folio fijo `PRE-DEMO-xxx`.
 */
class DemoSalesSeeder extends Seeder
{
    public function run(QuoteCalculator $calculator): void
    {
        $seller = User::where('email', SellerUserSeeder::email())->first();
        $issuer = Issuer::first();
        $clientGim = Client::where('rfc', 'GIM010101AB1')->first();
        $clientLio = Client::where('rfc', 'LIO120315KP9')->first();

        if (! $seller || ! $issuer || ! $clientGim || ! $clientLio) {
            $this->command?->error('Faltan datos base: ejecuta SellerUserSeeder, IssuerSeeder y ClientSeeder primero.');

            return;
        }

        DB::transaction(function () use ($calculator, $seller, $issuer, $clientGim, $clientLio) {
            // 1) Oportunidad principal: etapa "Presentado" con dos versiones de cotización.
            $main = $this->opportunity($seller, 'GIM · Renovación de red y cableado', $clientGim, 'presentado', 1, [
                'expected_close_date' => now()->addDays(20)->toDateString(),
                'notes' => 'Cliente solicita instalación en dos fases. Decide el comité a fin de mes.',
            ]);

            $this->quote($calculator, $seller, $issuer, $clientGim, $main, 'PRE-DEMO-001', 'GIM · Red y cableado v1', false, [
                'global_discount_type' => 'percentage', 'global_discount_value' => 0,
            ], [
                $this->item('producto', 'Switch administrable 24 puertos PoE', 'SW-24POE', 4, 5200, 8, 28),
                $this->item('producto', 'Access Point WiFi 6', 'AP-WIFI6', 10, 1850, 5, 30),
                $this->item('servicio', 'Instalación y configuración', null, 1, 12000, 0, 40),
            ]);

            // v2: con descuento general y plan de pagos; es la cotización vigente.
            $this->quote($calculator, $seller, $issuer, $clientGim, $main, 'PRE-DEMO-002', 'GIM · Red y cableado v2', true, [
                'global_discount_type' => 'percentage', 'global_discount_value' => 5,
                'has_payment_plan' => true, 'first_payment_type' => 'percentage', 'first_payment_value' => 50,
                'first_payment_date' => now()->addDays(7)->toDateString(), 'payment_months' => 3,
                'payment_terms' => 'Anticipo del 50% para iniciar; el saldo en 3 mensualidades.',
            ], [
                $this->item('producto', 'Switch administrable 24 puertos PoE', 'SW-24POE', 4, 5200, 8, 26),
                $this->item('producto', 'Access Point WiFi 6', 'AP-WIFI6', 12, 1850, 5, 28, 3),
                $this->item('producto', 'Rack 12U con organizadores', 'RACK-12U', 2, 3400, 0, 30),
                $this->item('servicio', 'Instalación y configuración', null, 1, 14500, 0, 40),
            ]);

            // 2) Oportunidad en "Calificado" sin cotización (usa monto estimado).
            $this->opportunity($seller, 'LIO · Enlace dedicado 500 Mbps', $clientLio, 'calificado', 1, [
                'estimated_amount' => 180000,
                'expected_close_date' => now()->addDays(45)->toDateString(),
            ]);

            // 3) Oportunidad ganada con su cotización en USD (muestra moneda y equivalente MXN).
            $won = $this->opportunity($seller, 'LIO · Licencias de seguridad', $clientLio, 'ganado', 1, [
                'closed_at' => now()->subDays(3),
            ]);

            $this->quote($calculator, $seller, $issuer, $clientLio, $won, 'PRE-DEMO-003', 'LIO · Licencias de seguridad', true, [
                'currency' => 'USD', 'exchange_rate' => 18.5, 'show_mxn_equivalent' => true,
                'global_discount_type' => 'fixed', 'global_discount_value' => 100,
            ], [
                $this->item('producto', 'Licencia firewall NGFW (1 año)', 'FW-LIC-1Y', 2, 950, 10, 22),
                $this->item('servicio', 'Soporte y monitoreo mensual', null, 12, 120, 0, 35),
            ]);
        });

        $this->command?->info('Demo: 3 oportunidades y 3 cotizaciones para '.$seller->email.'.');
    }

    /** @param array<string, mixed> $extra */
    private function opportunity(User $owner, string $name, Client $client, string $stage, int $position, array $extra = []): Opportunity
    {
        return Opportunity::updateOrCreate(
            ['owner_id' => $owner->id, 'name' => $name],
            $extra + [
                'client_id' => $client->id,
                'stage' => $stage,
                'position' => $position,
                'closed_at' => in_array($stage, Opportunity::CLOSED, true) ? now() : null,
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $header
     * @param  array<int, array<string, mixed>>  $items
     */
    private function quote(
        QuoteCalculator $calculator, User $seller, Issuer $issuer, Client $client,
        Opportunity $opportunity, string $number, string $name, bool $active, array $header, array $items
    ): Quote {
        $result = $calculator->calculate($header + ['currency' => 'MXN'], $items);

        $quote = Quote::updateOrCreate(['number' => $number], [
            'name' => $name,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(15)->toDateString(),
            'delivery_unit' => 'semanas',
            'delivery_days_min' => 1,
            'delivery_days_max' => 3,
            'seller_id' => $seller->id,
            'client_id' => $client->id,
            'client_data' => $client->snapshot(),
            'issuer_id' => $issuer->id,
            'issuer_data' => $issuer->snapshot(),
            'opportunity_id' => $opportunity->id,
            'active_with_client' => $active,
            ...collect($result['quote'])->except('down_payment_warning')->all(),
        ]);

        $quote->items()->delete();
        $quote->items()->createMany($result['items']);

        return $quote;
    }

    /** @return array<string, mixed> */
    private function item(
        string $type, string $description, ?string $sku, float $qty,
        float $cost, float $supplierDiscount, float $margin, float $clientDiscount = 0
    ): array {
        return [
            'item_type' => $type,
            'description' => $description,
            'sku' => $sku,
            'quantity' => $qty,
            'cost_unit_without_discount' => $cost,
            'discount_percent' => $supplierDiscount,
            'target_margin_percent' => $margin,
            'client_discount_percent' => $clientDiscount,
        ];
    }
}
