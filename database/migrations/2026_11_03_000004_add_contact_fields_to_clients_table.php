<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('contact')->nullable()->after('country');
            $table->string('email')->nullable()->after('contact');
            $table->string('phone', 50)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['contact', 'email', 'phone']);
        });
    }
};
