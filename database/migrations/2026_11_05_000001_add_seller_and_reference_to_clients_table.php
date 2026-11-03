<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('seller_name')->nullable()->after('phone');
            $table->string('reference_contact')->nullable()->after('seller_name');
            $table->string('reference_email')->nullable()->after('reference_contact');
            $table->string('reference_phone', 50)->nullable()->after('reference_email');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['seller_name', 'reference_contact', 'reference_email', 'reference_phone']);
        });
    }
};
