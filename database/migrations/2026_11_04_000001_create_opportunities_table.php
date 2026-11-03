<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('owner_id')->constrained('users');
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('stage', 20)->default('oportunidad');
            $table->unsignedInteger('position')->default(0);
            // Monto estimado en MXN mientras no haya cotizaciones anexas.
            $table->decimal('estimated_amount', 14, 2)->default(0);
            $table->date('expected_close_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('lost_reason', 500)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['owner_id', 'stage', 'position']);
        });

        // La columna ya existía en quotes; ahora apunta a la oportunidad.
        Schema::table('quotes', function (Blueprint $table) {
            $table->foreign('opportunity_id')->references('id')->on('opportunities')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropForeign(['opportunity_id']);
        });
        Schema::dropIfExists('opportunities');
    }
};
