<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Identificador estable de la cuenta Microsoft (oid); el correo puede cambiar.
            $table->string('microsoft_id')->nullable()->unique()->after('phone');
            $table->string('microsoft_email')->nullable()->after('microsoft_id');
            // Tokens cifrados (cast `encrypted`): permiten enviar correo en nombre del usuario.
            $table->text('microsoft_access_token')->nullable()->after('microsoft_email');
            $table->text('microsoft_refresh_token')->nullable()->after('microsoft_access_token');
            $table->timestamp('microsoft_token_expires_at')->nullable()->after('microsoft_refresh_token');
        });

        // Bitácora de cotizaciones enviadas por correo.
        Schema::create('quote_emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->json('to');
            $table->json('cc')->nullable();
            $table->string('subject');
            $table->string('attachment')->nullable();
            $table->timestamp('sent_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_emails');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['microsoft_id']);
            $table->dropColumn([
                'microsoft_id', 'microsoft_email', 'microsoft_access_token',
                'microsoft_refresh_token', 'microsoft_token_expires_at',
            ]);
        });
    }
};
