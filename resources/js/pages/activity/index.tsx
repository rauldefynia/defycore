import { Head, router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Change = { old?: unknown; new?: unknown } | unknown;

type Log = {
    id: number;
    action: string;
    user: string | null;
    user_id: number | null;
    subject_type: string | null;
    subject_id: number | null;
    subject_label: string | null;
    changes: Record<string, Change> | null;
    ip: string | null;
    user_agent: string | null;
    created_at: string | null;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

type Option = { key: string; label: string };

type Filters = {
    search: string;
    action: string | null;
    subject: string | null;
    user: string | null;
    from: string | null;
    to: string | null;
};

const BADGE: Record<string, string> = {
    created:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    updated: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    deleted: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    login_failed:
        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    email_sent:
        'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
};

const select = 'border-input bg-background h-9 rounded-md border px-3 text-sm';

const show = (v: unknown) => {
    if (v === null || v === undefined || v === '') {
        return '—';
    }

    return typeof v === 'object' ? JSON.stringify(v) : String(v);
};

const isDiff = (c: Change): c is { old?: unknown; new?: unknown } =>
    typeof c === 'object' &&
    c !== null &&
    !Array.isArray(c) &&
    ('old' in c || 'new' in c);

export default function ActivityIndex({
    logs,
    filters,
    actions,
    subjects,
    users,
}: {
    logs: Paginated<Log>;
    filters: Filters;
    actions: Option[];
    subjects: Option[];
    users: { id: number; name: string }[];
}) {
    const [f, setF] = useState({
        search: filters.search,
        action: filters.action ?? '',
        subject: filters.subject ?? '',
        user: filters.user ?? '',
        from: filters.from ?? '',
        to: filters.to ?? '',
    });
    const [open, setOpen] = useState<number | null>(null);

    const actionLabel = (k: string) =>
        actions.find((a) => a.key === k)?.label ?? k;
    const subjectLabel = (k: string | null) =>
        subjects.find((s) => s.key === k)?.label ?? k ?? '';

    const apply = (next: Partial<typeof f>) => {
        const merged = { ...f, ...next };
        setF(merged);
        router.get(
            '/bitacora',
            Object.fromEntries(Object.entries(merged).filter(([, v]) => v)),
            { preserveState: true, preserveScroll: true },
        );
    };

    const clear = () =>
        apply({
            search: '',
            action: '',
            subject: '',
            user: '',
            from: '',
            to: '',
        });

    const hasFilters = Object.values(f).some(Boolean);

    return (
        <>
            <Head title="Bitácora" />
            <div className="flex max-w-[1320px] flex-col gap-5 px-6 pt-4 pb-11">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight">
                        Bitácora
                    </h1>
                    <p className="text-muted-foreground text-[14.5px]">
                        {logs.total} movimientos · altas, cambios, bajas y
                        accesos al sistema
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({});
                        }}
                        className="flex min-w-60 flex-1 gap-2"
                    >
                        <Input
                            value={f.search}
                            onChange={(e) =>
                                setF({ ...f, search: e.target.value })
                            }
                            placeholder="Buscar por registro, usuario o IP"
                        />
                        <Button type="submit" variant="outline">
                            <Search />
                        </Button>
                    </form>
                    <select
                        aria-label="Acción"
                        className={select}
                        value={f.action}
                        onChange={(e) => apply({ action: e.target.value })}
                    >
                        <option value="">Todas las acciones</option>
                        {actions.map((a) => (
                            <option key={a.key} value={a.key}>
                                {a.label}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Módulo"
                        className={select}
                        value={f.subject}
                        onChange={(e) => apply({ subject: e.target.value })}
                    >
                        <option value="">Todos los módulos</option>
                        {subjects.map((s) => (
                            <option key={s.key} value={s.key}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Usuario"
                        className={select}
                        value={f.user}
                        onChange={(e) => apply({ user: e.target.value })}
                    >
                        <option value="">Todos los usuarios</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                    <Input
                        type="date"
                        aria-label="Desde"
                        className="w-40"
                        value={f.from}
                        onChange={(e) => apply({ from: e.target.value })}
                    />
                    <Input
                        type="date"
                        aria-label="Hasta"
                        className="w-40"
                        value={f.to}
                        onChange={(e) => apply({ to: e.target.value })}
                    />
                    {hasFilters && (
                        <Button variant="ghost" onClick={clear}>
                            <X /> Limpiar
                        </Button>
                    )}
                </div>

                <div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
                    <table className="w-full text-[13.5px]">
                        <thead>
                            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                                <th className="w-8 px-2 py-3" />
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Acción</th>
                                <th className="px-4 py-3">Módulo</th>
                                <th className="px-4 py-3">Registro</th>
                                <th className="px-4 py-3">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-muted-foreground px-4 py-10 text-center"
                                    >
                                        No hay movimientos con ese filtro.
                                    </td>
                                </tr>
                            )}
                            {logs.data.map((l) => {
                                const expanded = open === l.id;
                                const hasDetail =
                                    !!l.changes &&
                                    Object.keys(l.changes).length > 0;

                                return (
                                    <Fragment key={l.id}>
                                        <tr
                                            className={`border-b last:border-0 ${hasDetail ? 'hover:bg-muted/40 cursor-pointer' : ''}`}
                                            onClick={() =>
                                                hasDetail &&
                                                setOpen(expanded ? null : l.id)
                                            }
                                        >
                                            <td className="text-muted-foreground px-2 py-3">
                                                {hasDetail &&
                                                    (expanded ? (
                                                        <ChevronDown className="size-4" />
                                                    ) : (
                                                        <ChevronRight className="size-4" />
                                                    ))}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {l.created_at
                                                    ? new Date(
                                                          l.created_at,
                                                      ).toLocaleString(
                                                          'es-MX',
                                                          {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                              second: '2-digit',
                                                          },
                                                      )
                                                    : ''}
                                            </td>
                                            <td className="px-4 py-3">
                                                {l.user ?? (
                                                    <span className="text-muted-foreground">
                                                        Sistema / anónimo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[l.action] ?? 'bg-secondary text-secondary-foreground'}`}
                                                >
                                                    {actionLabel(l.action)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {subjectLabel(l.subject_type)}
                                            </td>
                                            <td className="max-w-80 truncate px-4 py-3">
                                                {l.subject_label}
                                            </td>
                                            <td className="text-muted-foreground px-4 py-3">
                                                {l.ip}
                                            </td>
                                        </tr>
                                        {expanded && l.changes && (
                                            <tr className="bg-muted/30 border-b">
                                                <td
                                                    colSpan={7}
                                                    className="px-6 py-4"
                                                >
                                                    <table className="w-full max-w-4xl text-[12.5px]">
                                                        <tbody>
                                                            {Object.entries(
                                                                l.changes,
                                                            ).map(([k, c]) => (
                                                                <tr
                                                                    key={k}
                                                                    className="align-top"
                                                                >
                                                                    <td className="text-muted-foreground w-48 py-1 pr-4 font-mono">
                                                                        {k}
                                                                    </td>
                                                                    {isDiff(
                                                                        c,
                                                                    ) ? (
                                                                        <td className="py-1">
                                                                            <span className="text-red-600 line-through dark:text-red-400">
                                                                                {show(
                                                                                    c.old,
                                                                                )}
                                                                            </span>
                                                                            <span className="text-muted-foreground px-2">
                                                                                →
                                                                            </span>
                                                                            <span className="text-emerald-700 dark:text-emerald-400">
                                                                                {show(
                                                                                    c.new,
                                                                                )}
                                                                            </span>
                                                                        </td>
                                                                    ) : (
                                                                        <td className="py-1 break-all">
                                                                            {show(
                                                                                c,
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {l.user_agent && (
                                                        <p className="text-muted-foreground mt-3 truncate text-xs">
                                                            {l.user_agent}
                                                        </p>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {logs.links.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                        {logs.links.map((link, i) => (
                            <Button
                                key={i}
                                size="sm"
                                variant={link.active ? 'default' : 'outline'}
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.get(
                                        link.url,
                                        {},
                                        { preserveState: true },
                                    )
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
