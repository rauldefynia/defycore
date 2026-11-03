<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SellerUserSeeder extends Seeder
{
    public static function email(): string
    {
        return env('SELLER_EMAIL', 'vendedor@defynia.mx');
    }

    /**
     * Crea (o actualiza) un usuario vendedor de prueba.
     * Credenciales configurables con SELLER_NAME, SELLER_EMAIL y SELLER_PASSWORD en .env.
     */
    public function run(): void
    {
        $user = User::firstOrNew(['email' => self::email()]);

        $user->forceFill([
            'name' => env('SELLER_NAME', 'Laura Vendedora'),
            'role' => User::ROLE_SELLER,
            'active' => true,
            'phone' => $user->phone ?? '3312345678',
            'password' => env('SELLER_PASSWORD', 'Vendedor12345!'),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();
    }
}
