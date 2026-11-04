<?php

namespace App\Models\Concerns;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

/**
 * Registra alta, modificación y baja del modelo en la bitácora.
 * El modelo define `activitySubject()` (clave corta) y `activityLabel()`.
 */
trait LogsActivity
{
    /** Campos que nunca se guardan en la bitácora (secretos y ruido). */
    private const ACTIVITY_IGNORED = [
        'id', 'created_at', 'updated_at', 'password', 'remember_token',
        'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at',
        'microsoft_access_token', 'microsoft_refresh_token', 'microsoft_token_expires_at', 'welcomed_at',
        'client_data', 'issuer_data',
    ];

    public static function bootLogsActivity(): void
    {
        static::created(fn ($m) => $m->logActivity('created', $m->activityValues($m->getAttributes())));

        static::updated(function ($m) {
            $changes = [];
            foreach ($m->activityValues($m->getChanges()) as $field => $new) {
                $changes[$field] = [
                    'old' => $m->activityValues([$field => $m->getRawOriginal($field)])[$field] ?? null,
                    'new' => $new,
                ];
            }
            // Si sólo cambió algo ignorado (p. ej. renovar un token) no hay nada que registrar.
            if ($changes) {
                $m->logActivity('updated', $changes);
            }
        });

        static::deleted(fn ($m) => $m->logActivity('deleted', $m->activityValues($m->getAttributes())));
    }

    abstract public function activitySubject(): string;

    abstract public function activityLabel(): string;

    protected function logActivity(string $action, array $changes): void
    {
        // Seeders y comandos sin sesión no son movimientos de un usuario.
        if (! Auth::check() && app()->runningInConsole()) {
            return;
        }

        ActivityLog::record($action, $this->activitySubject(), (int) $this->getKey(), $this->activityLabel(), $changes);
    }

    /** @return array<string, mixed> */
    protected function activityValues(array $attributes): array
    {
        $out = [];
        foreach ($attributes as $key => $value) {
            if (in_array($key, self::ACTIVITY_IGNORED, true)) {
                continue;
            }
            if (is_string($value) && mb_strlen($value) > 200) {
                $value = mb_substr($value, 0, 200).'…';
            }
            $out[$key] = $value;
        }

        return $out;
    }
}
