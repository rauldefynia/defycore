<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $guarded = ['id'];

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    /** Snapshot que se copia a la cotización. */
    public function snapshot(): array
    {
        return $this->only(['name', 'rfc', 'address', 'zip', 'city', 'state', 'country', 'contact', 'email', 'phone']);
    }
}
