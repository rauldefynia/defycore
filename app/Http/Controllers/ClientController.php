<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClientRequest;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $clients = Client::query()
            ->withCount('quotes')
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('rfc', 'like', "%{$search}%")
                ->orWhere('contact', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('clients/form', ['client' => null]);
    }

    public function store(ClientRequest $request): RedirectResponse
    {
        $client = Client::create($this->data($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente creado.']);

        return to_route('clients.edit', $client);
    }

    public function edit(Client $client): Response
    {
        return Inertia::render('clients/form', [
            'client' => $client->loadCount('quotes'),
        ]);
    }

    public function update(ClientRequest $request, Client $client): RedirectResponse
    {
        $client->update($this->data($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente actualizado.']);

        return back();
    }

    /** Las cotizaciones existentes conservan su snapshot del cliente. */
    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente eliminado.']);

        return to_route('clients.index');
    }

    /** @return array<string, mixed> */
    private function data(ClientRequest $request): array
    {
        $data = $request->validated();
        $data['country'] = $data['country'] ?? 'Mexico';

        return $data;
    }
}
