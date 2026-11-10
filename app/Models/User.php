<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Carbon\CarbonInterface;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden([
    'password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token',
    // Los tokens de Microsoft NUNCA deben llegar al navegador (auth.user se comparte con Inertia).
    'microsoft_access_token', 'microsoft_refresh_token',
])]
class User extends Authenticatable implements PasskeyUser
{
    use LogsActivity;

    public function activitySubject(): string
    {
        return 'user';
    }

    public function activityLabel(): string
    {
        return $this->name.' ('.$this->email.')';
    }

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    public const ROLE_ADMIN = 'admin';

    public const ROLE_SELLER = 'seller';

    public const ROLES = [
        self::ROLE_ADMIN => 'Administrador',
        self::ROLE_SELLER => 'Vendedor',
    ];

    /** @var list<string> */
    protected $appends = ['avatar', 'microsoft_connected'];

    /** ¿Tiene una cuenta Microsoft vinculada con permiso para enviar correo? */
    protected function microsoftConnected(): Attribute
    {
        return Attribute::get(fn () => ! empty($this->microsoft_id) && ! empty($this->microsoft_refresh_token));
    }

    /** Fecha en que vence la contraseña vigente, o null si no expira. */
    public function passwordExpiresAt(): ?CarbonInterface
    {
        if (! $this->password_expiry_days) {
            return null;
        }

        return ($this->password_changed_at ?? $this->created_at ?? now())->copy()->addDays($this->password_expiry_days);
    }

    public function passwordExpired(): bool
    {
        return $this->passwordExpiresAt()?->isPast() ?? false;
    }

    /** ¿Debe estrenar contraseña antes de usar el panel? (exigido por el administrador o expirada) */
    public function mustChangePassword(): bool
    {
        return (bool) $this->must_change_password || $this->passwordExpired();
    }

    /** Cambio hecho por la propia persona: limpia la exigencia y reinicia la vigencia. */
    public function changePassword(string $plain): void
    {
        $this->forceFill([
            'password' => $plain,
            'must_change_password' => false,
        ])->save();
    }

    /** Registra cuándo se estableció cada contraseña (base de la expiración). */
    protected static function booted(): void
    {
        static::saving(function (self $user) {
            if ($user->isDirty('password') && ! $user->isDirty('password_changed_at')) {
                $user->password_changed_at = now();
            }
        });
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class, 'seller_id');
    }

    public function opportunities(): HasMany
    {
        return $this->hasMany(Opportunity::class, 'owner_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class, 'owner_id');
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'seller_id');
    }

    /** URL relativa de la foto de perfil (o null); el `?v=` invalida la caché al cambiarla. */
    protected function avatar(): Attribute
    {
        return Attribute::get(fn () => $this->avatar_path
            ? route('avatars.show', $this, false).'?v='.substr(md5($this->avatar_path), 0, 10)
            : null);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'microsoft_access_token' => 'encrypted',
            'microsoft_refresh_token' => 'encrypted',
            'microsoft_token_expires_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'welcomed_at' => 'datetime',
            'must_change_password' => 'boolean',
            'password_expiry_days' => 'integer',
            'password_changed_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
