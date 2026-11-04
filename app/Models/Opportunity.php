<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Opportunity extends Model
{
    use LogsActivity;

    public function activitySubject(): string
    {
        return 'opportunity';
    }

    public function activityLabel(): string
    {
        return $this->name;
    }

    public const STAGES = [
        'oportunidad' => 'Oportunidad',
        'calificado' => 'Calificado',
        'dimensionamiento' => 'Dimensionamiento',
        'presentado' => 'Presentado',
        'ganado' => 'Ganado',
        'perdido' => 'Perdido',
    ];

    public const CLOSED = ['ganado', 'perdido'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'owner_id' => 'integer',
            'position' => 'integer',
            'estimated_amount' => 'float',
            'expected_close_date' => 'date:Y-m-d',
            'closed_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class)->withPivot('role')->withTimestamps();
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    /** Administrador, o el vendedor dueño. */
    public function isAccessibleBy(?User $user): bool
    {
        return $user !== null
            && ($user->isAdmin() || (int) $this->owner_id === (int) $user->getKey());
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->isAdmin() ? $query : $query->where('owner_id', $user->getKey());
    }

    /** Cotización vigente, o en su defecto la más reciente (requiere `quotes` cargadas). */
    public function referenceQuote(): ?Quote
    {
        return $this->quotes->firstWhere('active_with_client', true)
            ?? $this->quotes->sortByDesc('id')->first();
    }

    /** Valor de la oportunidad: el de la cotización de referencia o el monto estimado. */
    public function value(): array
    {
        $q = $this->referenceQuote();

        if (! $q) {
            return ['amount' => $this->estimated_amount, 'currency' => 'MXN', 'amount_mxn' => $this->estimated_amount];
        }

        $mxn = $q->currency === 'MXN' ? $q->total : $q->total * $q->exchange_rate;

        return ['amount' => $q->total, 'currency' => $q->currency, 'amount_mxn' => round($mxn, 2)];
    }

    /** Siguiente posición al final de una columna. */
    public static function nextPosition(int $ownerId, string $stage): int
    {
        return (int) static::where('owner_id', $ownerId)->where('stage', $stage)->max('position') + 1;
    }
}
