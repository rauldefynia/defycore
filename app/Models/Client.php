<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class Client extends Model
{
    use LogsActivity;

    public function activitySubject(): string
    {
        return 'client';
    }

    public function activityLabel(): string
    {
        return $this->name;
    }

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['seller_id' => 'integer'];
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    /** Administrador, o el vendedor al que está asignado el cliente. */
    public function isAccessibleBy(?User $user): bool
    {
        return $user !== null
            && ($user->isAdmin() || (int) $this->seller_id === (int) $user->getKey());
    }

    /** Clientes que el usuario puede ver: todos (admin) o sólo los suyos. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->isAdmin() ? $query : $query->where('seller_id', $user->getKey());
    }

    /** Regla de validación `exists` limitada a los clientes que el usuario puede usar. */
    public static function existsRule(User $user): Exists
    {
        $rule = Rule::exists('clients', 'id');

        return $user->isAdmin() ? $rule : $rule->where('seller_id', $user->getKey());
    }

    /** Snapshot que se copia a la cotización. */
    public function snapshot(): array
    {
        return $this->only(['name', 'rfc', 'address', 'zip', 'city', 'state', 'country', 'contact', 'email', 'phone']);
    }
}
