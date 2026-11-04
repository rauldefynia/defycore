<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
{
    /** Contactos de ejemplo (idempotente por correo). Se asignan al vendedor de prueba. */
    public function run(): void
    {
        $seller = User::where('email', SellerUserSeeder::email())->first();

        if (! $seller) {
            return;
        }

        $gim = Client::where('rfc', 'GIM010101AB1')->first();
        $lio = Client::where('rfc', 'LIO120315KP9')->first();

        $contacts = [
            ['name' => 'Ing. Rodrigo Cárdenas', 'position' => 'Director de TI', 'client_id' => $gim?->id, 'email' => 'rcardenas@gim.mx', 'phone' => '33 2000 1001', 'notes' => 'Decide las compras de infraestructura.'],
            ['name' => 'Marta Ibarra', 'position' => 'Compras', 'client_id' => $gim?->id, 'email' => 'mibarra@gim.mx', 'phone' => '33 2000 1002', 'mobile' => '33 1111 2222'],
            ['name' => 'Lic. Sofía Treviño', 'position' => 'Gerente de operaciones', 'client_id' => $lio?->id, 'email' => 'stravino@lio.mx', 'phone' => '33 3000 2020'],
            ['name' => 'Héctor Salinas', 'position' => 'Consultor externo', 'company' => 'Salinas & Asociados', 'email' => 'hsalinas@salinas.mx', 'mobile' => '55 9000 1212', 'notes' => 'Referencia de proyectos; no pertenece a un cliente.'],
        ];

        foreach ($contacts as $row) {
            Contact::updateOrCreate(['email' => $row['email']], $row + ['owner_id' => $seller->id]);
        }
    }
}
