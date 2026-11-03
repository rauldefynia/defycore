<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Quote;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $mine = Quote::where('seller_id', $request->user()->id);

        return Inertia::render('dashboard', [
            'stats' => [
                'quotes' => (clone $mine)->count(),
                'quotes_month' => (clone $mine)->where('date', '>=', now()->startOfMonth())->count(),
                'clients' => Client::count(),
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
