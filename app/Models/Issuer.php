<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Model;

class Issuer extends Model
{
    use LogsActivity;

    public function activitySubject(): string
    {
        return 'issuer';
    }

    public function activityLabel(): string
    {
        return $this->name;
    }

    protected $guarded = ['id'];

    /** Snapshot que se copia a la cotización. */
    public function snapshot(): array
    {
        return $this->only(['name', 'rfc', 'address', 'zip', 'city', 'state', 'country', 'phone', 'email', 'website']);
    }
}
