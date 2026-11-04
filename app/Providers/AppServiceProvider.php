<?php

namespace App\Providers;

use App\Models\ActivityLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->logAuthentication();
    }

    /** Inicios y cierres de sesión (incluido SSO) e intentos fallidos, en la bitácora. */
    protected function logAuthentication(): void
    {
        Event::listen(Login::class, fn (Login $e) => $e->user instanceof User
            ? ActivityLog::record('login', 'user', $e->user->getKey(), $e->user->activityLabel(), null, $e->user) : null);

        Event::listen(Logout::class, fn (Logout $e) => $e->user instanceof User
            ? ActivityLog::record('logout', 'user', $e->user->getKey(), $e->user->activityLabel(), null, $e->user) : null);

        Event::listen(Failed::class, fn (Failed $e) => ActivityLog::record(
            'login_failed', 'user', $e->user?->getKey(), (string) ($e->credentials['email'] ?? ''), null, $e->user instanceof User ? $e->user : null,
        ));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
