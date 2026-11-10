<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Debe cambiar la contraseña en el siguiente inicio de sesión.
            $table->boolean('must_change_password')->default(false);
            // Días de vigencia de la contraseña (null = no expira).
            $table->unsignedSmallInteger('password_expiry_days')->nullable();
            // Cuándo se estableció la contraseña vigente (base del cálculo de expiración).
            $table->timestamp('password_changed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['must_change_password', 'password_expiry_days', 'password_changed_at']);
        });
    }
};
