<?php

namespace App\Models;

use App\Support\ClientIp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/** Bitácora de movimientos del sistema. Sólo se inserta; nunca se edita. */
class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    /** Tipos de acción -> etiqueta. */
    public const ACTIONS = [
        'created' => 'Alta',
        'updated' => 'Modificación',
        'deleted' => 'Eliminación',
        'login' => 'Inicio de sesión',
        'logout' => 'Cierre de sesión',
        'login_failed' => 'Intento fallido',
        'email_sent' => 'Correo enviado',
    ];

    /** Clave corta del modelo -> etiqueta. */
    public const SUBJECTS = [
        'quote' => 'Cotización',
        'client' => 'Cliente',
        'contact' => 'Contacto',
        'opportunity' => 'Oportunidad',
        'user' => 'Usuario',
        'issuer' => 'Emisor',
    ];

    protected function casts(): array
    {
        return ['changes' => 'array'];
    }

    /**
     * Registra un movimiento con el usuario, IP y navegador actuales.
     *
     * @param  array<string, mixed>|null  $changes
     */
    public static function record(
        string $action,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?string $label = null,
        ?array $changes = null,
        ?User $actor = null,
    ): void {
        $actor ??= Auth::user();
        $request = app()->bound('request') ? request() : null;

        static::create([
            'user_id' => $actor?->getKey(),
            'user_name' => $actor?->name,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'subject_label' => $label !== null ? mb_substr($label, 0, 255) : null,
            'changes' => $changes ?: null,
            'ip' => ClientIp::resolve($request),
            'user_agent' => $request ? mb_substr((string) $request->userAgent(), 0, 255) : null,
        ]);
    }
}
