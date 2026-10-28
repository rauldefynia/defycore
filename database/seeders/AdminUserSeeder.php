<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Crea (o actualiza) el usuario administrador inicial.
     * Credenciales configurables con ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD en .env.
     */
    public function run(): void
    {
        $user = User::firstOrNew([
            'email' => env('ADMIN_EMAIL', 'admin@defynia.mx'),
        ]);

        $user->forceFill([
            'name' => env('ADMIN_NAME', 'Administrador'),
            'password' => env('ADMIN_PASSWORD', 'Admin12345!'),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();
    }
}
