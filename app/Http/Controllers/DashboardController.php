<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $mine = Quote::visibleTo($user);

        return Inertia::render('dashboard', [
            'stats' => [
                'quotes' => (clone $mine)->count(),
                'quotes_month' => (clone $mine)->where('date', '>=', now()->startOfMonth())->count(),
                'clients' => Client::visibleTo($user)->count(),
                'opportunities_open' => Opportunity::visibleTo($user)
                    ->whereNotIn('stage', Opportunity::CLOSED)->count(),
                'opportunities_won' => Opportunity::visibleTo($user)->where('stage', 'ganado')->count(),
                // Sólo el administrador ve el módulo de usuarios.
                'users' => $user->isAdmin() ? User::where('active', true)->count() : null,
            ],
            'recentQuotes' => (clone $mine)->latest('id')->limit(5)->get()
                ->map(fn (Quote $q) => [
                    'id' => $q->id,
                    'number' => $q->number,
                    'name' => $q->name,
                    'client' => $q->client_data['name'] ?? null,
                    'currency' => $q->currency,
                    'total' => $q->total,
                ]),
        ]);
    }
}
