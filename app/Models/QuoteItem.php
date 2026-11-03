<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteItem extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'cost_unit_without_discount' => 'float',
            'discount_percent' => 'float',
            'discount_amount' => 'float',
            'cost_unit' => 'float',
            'cost_total' => 'float',
            'target_margin_percent' => 'float',
            'sale_unit_price_without_client_discount' => 'float',
            'client_discount_percent' => 'float',
            'client_discount_amount' => 'float',
            'sale_unit_price' => 'float',
            'sale_total_price' => 'float',
            'unit_profit' => 'float',
            'unit_margin_percent' => 'float',
            'line_profit' => 'float',
            'line_margin_percent' => 'float',
            'cost_total_mxn' => 'float',
            'sale_total_price_mxn' => 'float',
            'line_profit_mxn' => 'float',
        ];
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }
}
