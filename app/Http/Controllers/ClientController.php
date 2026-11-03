<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClientRequest;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $clients = Client::query()
            ->visibleTo($request->user())
            ->withCount('quotes')
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('rfc', 'like', "%{$search}%")
                ->orWhere('contact', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('seller_name', 'like', "%{$search}%")))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('clients/form', [
            'client' => null,
            ...$this->sellerProps($request),
        ]);
    }

    public function store(ClientRequest $request): RedirectResponse
    {
        $client = Client::create($this->data($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente creado.']);

        return to_route('clients.edit', $client);
    }

    public function edit(Request $request, Client $client): Response
    {
        Gate::allowIf($client->isAccessibleBy($request->user()));

        return Inertia::render('clients/form', [
            'client' => $client->loadCount('quotes'),
            ...$this->sellerProps($request),
        ]);
    }

    public function update(ClientRequest $request, Client $client): RedirectResponse
    {
        Gate::allowIf($client->isAccessibleBy($request->user()));

        $client->update($this->data($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente actualizado.']);

        return back();
    }

    /** Las cotizaciones existentes conservan su snapshot del cliente. */
    public function destroy(Request $request, Client $client): RedirectResponse
    {
        Gate::allowIf($client->isAccessibleBy($request->user()));

        $client->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente eliminado.']);

        return to_route('clients.index');
    }

    /** Vendedores asignables: sólo el administrador puede elegir a quién se asigna el cliente. */
    private function sellerProps(Request $request): array
    {
        $user = $request->user();

        return [
            'isAdmin' => $user->isAdmin(),
            'sellers' => $user->isAdmin()
                ? User::where('active', true)->orderBy('name')->get(['id', 'name'])
                : [['id' => $user->id, 'name' => $user->name]],
        ];
    }

    /** @return array<string, mixed> */
    private function data(ClientRequest $request): array
    {
        $user = $request->user();
        $data = $request->validated();
        $data['country'] = $data['country'] ?? 'Mexico';

        // Un vendedor sólo puede crear/editar clientes propios; el administrador elige el vendedor.
        $data['seller_id'] = $user->isAdmin() ? ($data['seller_id'] ?? null) : $user->id;
        $data['seller_name'] = $data['seller_id']
            ? User::whereKey($data['seller_id'])->value('name')
            : null;

        return $data;
    }
}
