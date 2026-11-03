<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('seller')->after('email');
            $table->boolean('active')->default(true)->after('role');
            $table->string('phone', 50)->nullable()->after('active');
        });

        // Los usuarios que ya existían operan el panel completo: pasan a administrador
        // para no quedar fuera al activar los permisos.
        DB::table('users')->update(['role' => 'admin']);

        // Vendedor dueño del cliente: un vendedor sólo ve a los suyos.
        Schema::table('clients', function (Blueprint $table) {
            $table->foreignId('seller_id')->nullable()->after('phone')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('seller_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'active', 'phone']);
        });
    }
};
