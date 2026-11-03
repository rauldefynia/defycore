<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->string('name');
            $table->date('date');
            $table->date('due_date')->nullable();
            $table->unsignedInteger('delivery_days_min')->default(1);
            $table->unsignedInteger('delivery_days_max')->default(5);
            $table->string('delivery_unit', 20)->default('dias');
            $table->text('notes')->nullable();

            $table->foreignId('seller_id')->constrained('users');
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->json('client_data')->nullable();
            $table->foreignId('issuer_id')->nullable()->constrained()->nullOnDelete();
            $table->json('issuer_data')->nullable();
            // El módulo de oportunidades aún no existe; la columna queda lista.
            $table->unsignedBigInteger('opportunity_id')->nullable()->index();
            $table->boolean('active_with_client')->default(false);

            $table->string('currency', 3)->default('MXN');
            $table->decimal('exchange_rate', 18, 6)->default(1);
            $table->boolean('show_mxn_equivalent')->default(false);

            $table->decimal('summary_cost', 14, 2)->default(0);
            $table->decimal('summary_sale_total', 14, 2)->default(0);
            $table->decimal('summary_profit', 14, 2)->default(0);
            $table->decimal('summary_margin_percent', 8, 2)->default(0);
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);

            $table->string('global_discount_type', 12)->default('percentage');
            $table->decimal('global_discount_value', 15, 4)->default(0);
            $table->decimal('global_discount_amount', 15, 2)->default(0);

            $table->decimal('subtotal_mxn', 18, 2)->nullable();
            $table->decimal('tax_amount_mxn', 18, 2)->nullable();
            $table->decimal('total_mxn_equivalent', 18, 2)->nullable();

            $table->boolean('has_payment_plan')->default(false);
            $table->string('first_payment_type', 12)->nullable();
            $table->decimal('first_payment_value', 15, 4)->nullable();
            $table->date('first_payment_date')->nullable();
            $table->unsignedInteger('payment_months')->nullable()->default(1);
            $table->decimal('first_payment_amount', 15, 2)->nullable();
            $table->decimal('remaining_amount', 15, 2)->nullable();
            $table->decimal('monthly_payment_amount', 15, 2)->nullable();
            $table->json('payment_schedule')->nullable();
            $table->text('payment_terms')->nullable();

            $table->timestamps();
        });

        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('item_number')->default(1);
            $table->string('item_type', 12)->default('producto');
            $table->string('description');
            $table->text('detail')->nullable();
            $table->string('sku')->nullable();
            $table->decimal('quantity', 12, 2)->default(1);

            $table->decimal('cost_unit_without_discount', 14, 4)->default(0);
            $table->decimal('discount_percent', 8, 2)->default(0);
            $table->decimal('discount_amount', 14, 4)->default(0);
            $table->decimal('cost_unit', 14, 4)->default(0);
            $table->decimal('cost_total', 14, 2)->default(0);

            $table->decimal('target_margin_percent', 8, 2)->default(0);
            $table->decimal('sale_unit_price_without_client_discount', 14, 4)->default(0);
            $table->decimal('client_discount_percent', 8, 2)->default(0);
            $table->decimal('client_discount_amount', 14, 4)->default(0);
            $table->decimal('sale_unit_price', 14, 4)->default(0);
            $table->decimal('sale_total_price', 14, 2)->default(0);

            $table->decimal('unit_profit', 14, 4)->default(0);
            $table->decimal('unit_margin_percent', 8, 2)->default(0);
            $table->decimal('line_profit', 14, 2)->default(0);
            $table->decimal('line_margin_percent', 8, 2)->default(0);

            $table->decimal('cost_total_mxn', 18, 2)->nullable();
            $table->decimal('sale_total_price_mxn', 18, 2)->nullable();
            $table->decimal('line_profit_mxn', 18, 2)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_items');
        Schema::dropIfExists('quotes');
    }
};
