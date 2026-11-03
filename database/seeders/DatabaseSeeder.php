<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * El administrador se crea siempre. Los datos de prueba (vendedor con contraseña conocida,
     * clientes y cotizaciones de ejemplo) NO se siembran en producción; para forzarlo:
     * `php artisan db:seed --class=DemoSalesSeeder` (tras los seeders base).
     */
    public function run(): void
    {
        $this->call(AdminUserSeeder::class);

        if (app()->isProduction()) {
            return;
        }

        $this->call([
            SellerUserSeeder::class,
            IssuerSeeder::class,
            ClientSeeder::class,
            DemoSalesSeeder::class,
        ]);
    }
}
