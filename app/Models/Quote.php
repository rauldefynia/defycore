<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    use LogsActivity;

    public function activitySubject(): string
    {
        return 'quote';
    }

    public function activityLabel(): string
    {
        return $this->number.' · '.$this->name;
    }

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'due_date' => 'date:Y-m-d',
            'first_payment_date' => 'date:Y-m-d',
            'seller_id' => 'integer',
            'client_data' => 'array',
            'issuer_data' => 'array',
            'payment_schedule' => 'array',
            'show_mxn_equivalent' => 'boolean',
            'has_payment_plan' => 'boolean',
            'active_with_client' => 'boolean',
            'exchange_rate' => 'float',
            'summary_cost' => 'float',
            'summary_sale_total' => 'float',
            'summary_profit' => 'float',
            'summary_margin_percent' => 'float',
            'subtotal' => 'float',
            'tax_amount' => 'float',
            'total' => 'float',
            'global_discount_value' => 'float',
            'global_discount_amount' => 'float',
            'subtotal_mxn' => 'float',
            'tax_amount_mxn' => 'float',
            'total_mxn_equivalent' => 'float',
            'first_payment_value' => 'float',
            'first_payment_amount' => 'float',
            'remaining_amount' => 'float',
            'monthly_payment_amount' => 'float',
        ];
    }

    /** Administrador, o el vendedor dueño. Se compara como entero: el id puede llegar como "1" o 1. */
    public function isAccessibleBy(?User $user): bool
    {
        return $user !== null
            && ($user->isAdmin() || (int) $this->seller_id === (int) $user->getKey());
    }

    /** Cotizaciones que el usuario puede ver: todas (admin) o sólo las suyas. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->isAdmin() ? $query : $query->where('seller_id', $user->getKey());
    }

    public static function generateNumber(): string
    {
        $base = 'PRE-'.now()->format('YmdHis');
        $number = $base;

        // Dos cotizaciones en el mismo segundo no pueden compartir folio (es único).
        for ($i = 2; static::where('number', $number)->exists(); $i++) {
            $number = $base.'-'.$i;
        }

        return $number;
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class)->orderBy('item_number');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function emails(): HasMany
    {
        return $this->hasMany(QuoteEmail::class)->latest('sent_at');
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(Issuer::class);
    }
}
