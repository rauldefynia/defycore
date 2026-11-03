<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('rfc', 13)->unique();
            $table->string('zip', 10)->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->default('Mexico');
            $table->timestamps();
        });

        Schema::create('issuers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('rfc', 13)->nullable();
            $table->string('address')->nullable();
            $table->string('zip', 10)->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->default('México');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issuers');
        Schema::dropIfExists('clients');
    }
};
