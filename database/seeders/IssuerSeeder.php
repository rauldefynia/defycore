<?php

namespace Database\Seeders;

use App\Models\Issuer;
use Illuminate\Database\Seeder;

class IssuerSeeder extends Seeder
{
    /** Emisor (empresa que cotiza) de ejemplo para los PDFs. */
    public function run(): void
    {
        Issuer::updateOrCreate(
            ['name' => 'Defynia Tecnología S.A. de C.V.'],
            [
                'rfc' => 'DTE200101AB1',
                'address' => 'Av. Américas 1500, Col. Country Club',
                'zip' => '44610',
                'city' => 'Guadalajara',
                'state' => 'Jalisco',
                'country' => 'México',
                'phone' => '33 1234 5678',
                'email' => 'ventas@defynia.mx',
                'website' => 'https://defynia.mx',
            ]
        );
    }
}
