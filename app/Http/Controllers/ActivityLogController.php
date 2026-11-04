<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Bitácora de movimientos (sólo administradores; ver middleware `admin` en las rutas). */
class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $action = $request->query('action');
        $subject = $request->query('subject');
        $userId = $request->query('user');
        $from = $request->query('from');
        $to = $request->query('to');

        $logs = ActivityLog::query()
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('subject_label', 'like', "%{$search}%")
                ->orWhere('user_name', 'like', "%{$search}%")
                ->orWhere('ip', 'like', "%{$search}%")))
            ->when(array_key_exists((string) $action, ActivityLog::ACTIONS), fn ($q) => $q->where('action', $action))
            ->when(array_key_exists((string) $subject, ActivityLog::SUBJECTS), fn ($q) => $q->where('subject_type', $subject))
            ->when(ctype_digit((string) $userId), fn ($q) => $q->where('user_id', $userId))
            ->when($this->validDate($from), fn ($q) => $q->where('created_at', '>=', $from.' 00:00:00'))
            ->when($this->validDate($to), fn ($q) => $q->where('created_at', '<=', $to.' 23:59:59'))
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (ActivityLog $l) => [
                'id' => $l->id,
                'action' => $l->action,
                'user' => $l->user_name,
                'user_id' => $l->user_id,
                'subject_type' => $l->subject_type,
                'subject_id' => $l->subject_id,
                'subject_label' => $l->subject_label,
                'changes' => $l->changes,
                'ip' => $l->ip,
                'user_agent' => $l->user_agent,
                'created_at' => $l->created_at?->toIso8601String(),
            ]);

        return Inertia::render('activity/index', [
            'logs' => $logs,
            'filters' => [
                'search' => $search,
                'action' => $action,
                'subject' => $subject,
                'user' => $userId,
                'from' => $from,
                'to' => $to,
            ],
            'actions' => collect(ActivityLog::ACTIONS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
            'subjects' => collect(ActivityLog::SUBJECTS)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values(),
            'users' => User::orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function validDate(mixed $value): bool
    {
        return is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1;
    }
}
