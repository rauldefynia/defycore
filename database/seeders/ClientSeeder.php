<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    /**
     * Clientes de ejemplo (idempotente por RFC). Dos quedan asignados al vendedor de prueba,
     * uno al administrador y otro sin asignar (sólo lo ve el administrador).
     */
    public function run(): void
    {
        $seller = User::where('email', SellerUserSeeder::email())->first();
        $admin = User::where('email', env('ADMIN_EMAIL', 'admin@defynia.mx'))->first();

        $clients = [
            [
                'rfc' => 'GIM010101AB1', 'name' => 'Grupo Industrial Morelos S.A. de C.V.',
                'contact' => 'Ing. Rodrigo Cárdenas', 'email' => 'rcardenas@gim.mx', 'phone' => '33 2000 1001',
                'reference_contact' => 'Marta Ibarra', 'reference_email' => 'mibarra@gim.mx', 'reference_phone' => '33 2000 1002',
                'address' => 'Calz. Industrial 450', 'zip' => '44940', 'city' => 'Guadalajara', 'state' => 'Jalisco',
                'owner' => $seller,
            ],
            [
                'rfc' => 'LIO120315KP9', 'name' => 'Logística Integral de Occidente S.A. de C.V.',
                'contact' => 'Lic. Sofía Treviño', 'email' => 'stravino@lio.mx', 'phone' => '33 3000 2020',
                'address' => 'Blvd. Puerta de Hierro 4965', 'zip' => '45116', 'city' => 'Zapopan', 'state' => 'Jalisco',
                'owner' => $seller,
            ],
            [
                'rfc' => 'ASR080722HT4', 'name' => 'Alimentos Santa Rosa S.A. de C.V.',
                'contact' => 'C.P. Ernesto Villalobos', 'email' => 'evillalobos@santarosa.mx', 'phone' => '55 4000 3030',
                'address' => 'Av. Revolución 1200', 'zip' => '03800', 'city' => 'Ciudad de México', 'state' => 'CDMX',
                'owner' => $admin,
            ],
            [
                'rfc' => 'CMA150610QX2', 'name' => 'Clínica Médica Andrade S.C.',
                'contact' => 'Dra. Paola Andrade', 'email' => 'contacto@clinicaandrade.mx', 'phone' => '81 5000 4040',
                'address' => 'Av. Constitución 780', 'zip' => '64000', 'city' => 'Monterrey', 'state' => 'Nuevo León',
                'owner' => null, // sin asignar
            ],
        ];

        foreach ($clients as $row) {
            $owner = $row['owner'];
            unset($row['owner']);

            Client::updateOrCreate(['rfc' => $row['rfc']], $row + [
                'country' => 'Mexico',
                'seller_id' => $owner?->id,
                'seller_name' => $owner?->name,
            ]);
        }
    }
}
