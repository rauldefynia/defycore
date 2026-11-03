<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Administración de usuarios (sólo administradores; ver middleware `admin` en las rutas). */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $role = $request->query('role');

        $users = User::query()
            ->withCount(['quotes', 'opportunities', 'clients'])
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->when(in_array($role, array_keys(User::ROLES), true), fn ($q) => $q->where('role', $role))
            ->orderByDesc('active')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => ['search' => $search, 'role' => $role],
            'roles' => $this->roles(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('users/form', ['user' => null, 'roles' => $this->roles()]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = new User;
        $user->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'],
            'active' => $request->boolean('active', true),
            'password' => $data['password'],
            // Lo da de alta un administrador: no requiere verificar el correo.
            'email_verified_at' => now(),
        ])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario creado.']);

        return to_route('users.edit', $user);
    }

    public function edit(User $user): Response
    {
        return Inertia::render('users/form', [
            'user' => $user->loadCount(['quotes', 'opportunities', 'clients']),
            'roles' => $this->roles(),
        ]);
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();
        $active = $request->boolean('active', true);

        $this->guardLastAdmin($request, $user, $data['role'], $active);

        $user->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'],
            'active' => $active,
        ]);

        if ($user->isDirty('email')) {
            $user->email_verified_at = now();
        }

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario actualizado.']);

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->guardLastAdmin($request, $user, null, false);

        // Con historial no se borra (se perdería quién cotizó); se desactiva.
        if ($user->quotes()->exists() || $user->opportunities()->exists()) {
            throw ValidationException::withMessages([
                'user' => 'Este usuario tiene cotizaciones u oportunidades. Desactívalo en lugar de eliminarlo.',
            ]);
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario eliminado.']);

        return to_route('users.index');
    }

    /**
     * Evita que un administrador se quite el acceso a sí mismo o deje el sistema sin administradores.
     */
    private function guardLastAdmin(Request $request, User $target, ?string $newRole, bool $newActive): void
    {
        $losesAdmin = $target->isAdmin() && $target->active
            && ($newRole !== User::ROLE_ADMIN || ! $newActive);

        if (! $losesAdmin) {
            return;
        }

        if ($request->user()->is($target)) {
            throw ValidationException::withMessages([
                'role' => 'No puedes quitarte el acceso de administrador, desactivarte ni eliminarte a ti mismo.',
            ]);
        }

        $others = User::where('role', User::ROLE_ADMIN)->where('active', true)
            ->where('id', '!=', $target->id)->exists();

        if (! $others) {
            throw ValidationException::withMessages([
                'role' => 'Debe quedar al menos un administrador activo.',
            ]);
        }
    }

    /** @return array<int, array{key: string, label: string}> */
    private function roles(): array
    {
        return collect(User::ROLES)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values()->all();
    }
}
