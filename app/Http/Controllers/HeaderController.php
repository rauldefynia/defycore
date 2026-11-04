<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Datos de la barra superior: búsqueda global y notificaciones. Siempre limitados a lo que el usuario puede ver. */
class HeaderController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $user = $request->user();
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        // Escapa los comodines de LIKE para que "%" o "_" se busquen literalmente.
        $like = '%'.addcslashes($q, '\\%_').'%';
        $results = [];

        Client::visibleTo($user)
            ->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('rfc', 'like', $like)->orWhere('email', 'like', $like))
            ->orderBy('name')->limit(5)->get(['id', 'name', 'rfc'])
            ->each(function ($c) use (&$results) {
                $results[] = ['type' => 'client', 'title' => $c->name, 'subtitle' => $c->rfc, 'href' => "/clientes/{$c->id}/editar"];
            });

        Contact::visibleTo($user)
            ->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('company', 'like', $like))
            ->orderBy('name')->limit(5)->get(['id', 'name', 'position', 'company'])
            ->each(function ($c) use (&$results) {
                $results[] = ['type' => 'contact', 'title' => $c->name, 'subtitle' => $c->position ?: $c->company, 'href' => "/contactos/{$c->id}/editar"];
            });

        Quote::visibleTo($user)
            ->where(fn ($w) => $w->where('number', 'like', $like)->orWhere('name', 'like', $like)->orWhere('client_data->name', 'like', $like))
            ->latest('id')->limit(5)->get(['id', 'number', 'name', 'client_data'])
            ->each(function ($qt) use (&$results) {
                $results[] = ['type' => 'quote', 'title' => "{$qt->number} · {$qt->name}", 'subtitle' => $qt->client_data['name'] ?? null, 'href' => "/cotizaciones/{$qt->id}/editar"];
            });

        Opportunity::visibleTo($user)
            ->where('name', 'like', $like)
            ->latest('id')->limit(5)->get(['id', 'name', 'stage'])
            ->each(function ($o) use (&$results) {
                $results[] = ['type' => 'opportunity', 'title' => $o->name, 'subtitle' => $o->stage, 'href' => "/oportunidades/{$o->id}"];
            });

        if ($user->isAdmin()) {
            User::where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like))
                ->orderBy('name')->limit(5)->get(['id', 'name', 'email'])
                ->each(function ($u) use (&$results) {
                    $results[] = ['type' => 'user', 'title' => $u->name, 'subtitle' => $u->email, 'href' => "/usuarios/{$u->id}/editar"];
                });
        }

        return response()->json(['results' => $results]);
    }

    /** Avisos calculados al vuelo: vencimientos próximos y, para administradores, accesos fallidos. */
    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->startOfDay();
        $soon = $today->copy()->addDays(3);
        $items = [];

        Opportunity::visibleTo($user)
            ->whereNotIn('stage', ['ganado', 'perdido'])
            ->whereNotNull('expected_close_date')
            ->whereDate('expected_close_date', '<=', $soon)
            ->orderBy('expected_close_date')->limit(10)->get(['id', 'name', 'expected_close_date'])
            ->each(function ($o) use (&$items, $today) {
                $overdue = $o->expected_close_date->lt($today);
                $items[] = [
                    'kind' => $overdue ? 'danger' : 'warning',
                    'title' => $overdue ? 'Oportunidad vencida' : 'Oportunidad por vencer',
                    'text' => "{$o->name} · cierre {$o->expected_close_date->format('d/m/Y')}",
                    'href' => "/oportunidades/{$o->id}",
                ];
            });

        Quote::visibleTo($user)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $today->copy()->subDays(7))
            ->whereDate('due_date', '<=', $soon)
            ->orderBy('due_date')->limit(10)->get(['id', 'number', 'name', 'due_date'])
            ->each(function ($qt) use (&$items, $today) {
                $expired = $qt->due_date->lt($today);
                $items[] = [
                    'kind' => $expired ? 'danger' : 'warning',
                    'title' => $expired ? 'Cotización vencida' : 'Cotización por vencer',
                    'text' => "{$qt->number} · {$qt->name} · vigencia {$qt->due_date->format('d/m/Y')}",
                    'href' => "/cotizaciones/{$qt->id}/editar",
                ];
            });

        if ($user->isAdmin()) {
            $failed = ActivityLog::where('action', 'login_failed')->where('created_at', '>=', now()->subDay())->count();
            if ($failed > 0) {
                $items[] = [
                    'kind' => 'danger',
                    'title' => 'Intentos de acceso fallidos',
                    'text' => "{$failed} en las últimas 24 horas",
                    'href' => '/bitacora?action=login_failed',
                ];
            }
        }

        return response()->json(['items' => $items]);
    }
}
