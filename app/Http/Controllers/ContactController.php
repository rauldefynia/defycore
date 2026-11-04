<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Models\Client;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('search', ''));
        $clientId = $request->query('client');

        $contacts = Contact::query()
            ->visibleTo($user)
            ->with(['client:id,name', 'owner:id,name'])
            ->withCount(['opportunities', 'quotes'])
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('company', 'like', "%{$search}%")
                ->orWhere('position', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('mobile', 'like', "%{$search}%")))
            ->when(ctype_digit((string) $clientId), fn ($q) => $q->where('client_id', $clientId))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Contact $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'position' => $c->position,
                'company' => $c->company,
                'client' => $c->client?->name,
                'client_id' => $c->client_id,
                'email' => $c->email,
                'phone' => $c->phone,
                'mobile' => $c->mobile,
                'owner' => $c->owner?->name,
                'opportunities_count' => $c->opportunities_count,
                'quotes_count' => $c->quotes_count,
            ]);

        return Inertia::render('contacts/index', [
            'contacts' => $contacts,
            'filters' => ['search' => $search, 'client' => $clientId],
            'clients' => Client::visibleTo($user)->orderBy('name')->get(['id', 'name']),
            'isAdmin' => $user->isAdmin(),
        ]);
    }

    /** Búsqueda para selectores (JSON): máximo 10 contactos visibles para el usuario. */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $like = '%'.addcslashes($q, '\%_').'%';
        $exclude = collect(explode(',', (string) $request->query('exclude', '')))
            ->filter(fn ($id) => ctype_digit($id))->all();

        $contacts = Contact::visibleTo($request->user())
            ->with('client:id,name')
            ->when($q !== '', fn ($w) => $w->where(fn ($w) => $w
                ->where('name', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhere('company', 'like', $like)
                ->orWhere('position', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('mobile', 'like', $like)))
            ->when($exclude, fn ($w) => $w->whereNotIn('id', $exclude))
            ->orderBy('name')
            ->limit(10)
            ->get()
            ->map(fn (Contact $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'position' => $c->position,
                'organization' => $c->client?->name ?? $c->company,
                'client_id' => $c->client_id,
                'email' => $c->email,
                'phone' => $c->phone,
                'mobile' => $c->mobile,
            ]);

        return response()->json(['contacts' => $contacts]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('contacts/form', [
            'contact' => null,
            'defaults' => ['client_id' => Client::visibleTo($request->user())->find($request->query('client'))?->id],
            ...$this->catalogs($request),
        ]);
    }

    public function store(ContactRequest $request): RedirectResponse
    {
        $contact = Contact::create($this->data($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Contacto creado.']);

        return to_route('contacts.edit', $contact);
    }

    public function edit(Request $request, Contact $contact): Response
    {
        Gate::allowIf($contact->isAccessibleBy($request->user()));

        return Inertia::render('contacts/form', [
            'contact' => $contact->loadCount(['opportunities', 'quotes']),
            'defaults' => null,
            ...$this->catalogs($request),
        ]);
    }

    public function update(ContactRequest $request, Contact $contact): RedirectResponse
    {
        Gate::allowIf($contact->isAccessibleBy($request->user()));

        $contact->update($this->data($request, $contact));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Contacto actualizado.']);

        return back();
    }

    /** Las cotizaciones conservan los datos de contacto con los que se emitieron. */
    public function destroy(Request $request, Contact $contact): RedirectResponse
    {
        Gate::allowIf($contact->isAccessibleBy($request->user()));

        $contact->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Contacto eliminado.']);

        return to_route('contacts.index');
    }

    /** @return array<string, mixed> */
    private function catalogs(Request $request): array
    {
        $user = $request->user();

        return [
            'isAdmin' => $user->isAdmin(),
            'clients' => Client::visibleTo($user)->orderBy('name')->get(['id', 'name']),
            'owners' => $user->isAdmin()
                ? User::where('active', true)->orderBy('name')->get(['id', 'name'])
                : [['id' => $user->id, 'name' => $user->name]],
        ];
    }

    /** @return array<string, mixed> */
    private function data(ContactRequest $request, ?Contact $contact = null): array
    {
        $user = $request->user();
        $data = $request->validated();

        // El vendedor siempre es dueño de sus contactos; el administrador puede reasignarlos.
        $data['owner_id'] = $user->isAdmin()
            ? ($data['owner_id'] ?? $contact?->owner_id ?? $user->id)
            : ($contact?->owner_id ?? $user->id);

        return $data;
    }
}
