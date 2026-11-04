<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/** Persona de contacto reutilizable (no tiene que ser usuario del sistema). */
class Contact extends Model
{
    use LogsActivity;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['owner_id' => 'integer', 'client_id' => 'integer'];
    }

    public function activitySubject(): string
    {
        return 'contact';
    }

    public function activityLabel(): string
    {
        return $this->name;
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function opportunities(): BelongsToMany
    {
        return $this->belongsToMany(Opportunity::class)->withPivot('role')->withTimestamps();
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    /** Administrador, o el vendedor dueño del contacto. */
    public function isAccessibleBy(?User $user): bool
    {
        return $user !== null
            && ($user->isAdmin() || (int) $this->owner_id === (int) $user->getKey());
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $user->isAdmin() ? $query : $query->where('owner_id', $user->getKey());
    }

    public static function existsRule(User $user): Exists
    {
        $rule = Rule::exists('contacts', 'id');

        return $user->isAdmin() ? $rule : $rule->where('owner_id', $user->getKey());
    }
}
