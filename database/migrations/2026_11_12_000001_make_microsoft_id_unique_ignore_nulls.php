<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * SQL Server trata los NULL como valores iguales en un índice único, así que sólo un usuario
 * podía existir sin cuenta de Microsoft. Se reemplaza por un índice único filtrado que ignora
 * los NULL (MySQL, PostgreSQL y SQLite ya se comportan así; no se toca nada ahí).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlsrv') {
            return;
        }

        if (Schema::hasIndex('users', 'users_microsoft_id_unique')) {
            DB::statement('DROP INDEX [users_microsoft_id_unique] ON [users]');
        }

        DB::statement('CREATE UNIQUE INDEX [users_microsoft_id_unique] ON [users] ([microsoft_id]) WHERE [microsoft_id] IS NOT NULL');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlsrv') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS [users_microsoft_id_unique] ON [users]');
        DB::statement('CREATE UNIQUE INDEX [users_microsoft_id_unique] ON [users] ([microsoft_id])');
    }
};
