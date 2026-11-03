<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Issuer extends Model
{
    protected $guarded = ['id'];

    /** Snapshot que se copia a la cotización. */
    public function snapshot(): array
    {
        return $this->only(['name', 'rfc', 'address', 'zip', 'city', 'state', 'country', 'phone', 'email', 'website']);
    }
}
