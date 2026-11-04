import { router, usePage } from '@inertiajs/react';
import {
    BookUser,
    FileText,
    Kanban,
    LayoutGrid,
    Search,
    UserRound,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Auth } from '@/types';

type Result = {
    type: 'client' | 'contact' | 'quote' | 'opportunity' | 'user' | 'page';
    title: string;
    subtitle?: string | null;
    href: string;
};

const TYPE: Record<Result['type'], { label: string; icon: LucideIcon }> = {
    page: { label: 'Ir a', icon: LayoutGrid },
    client: { label: 'Clientes', icon: Users },
    contact: { label: 'Contactos', icon: BookUser },
    quote: { label: 'Cotizaciones', icon: FileText },
    opportunity: { label: 'Oportunidades', icon: Kanban },
    user: { label: 'Usuarios', icon: UserRound },
};

/** Buscador global (Ctrl/⌘ + K): clientes, cotizaciones, oportunidades y, para admin, usuarios. */
export function GlobalSearch() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isAdmin = auth.user?.role === 'admin';
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [found, setFound] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    const pages = useMemo<Result[]>(
        () => [
            { type: 'page', title: 'Inicio', href: '/dashboard' },
            { type: 'page', title: 'Oportunidades', href: '/oportunidades' },
            { type: 'page', title: 'Cotizaciones', href: '/cotizaciones' },
            { type: 'page', title: 'Clientes', href: '/clientes' },
            { type: 'page', title: 'Contactos', href: '/contactos' },
            ...(isAdmin
                ? ([
                      { type: 'page', title: 'Usuarios', href: '/usuarios' },
                      { type: 'page', title: 'Bitácora', href: '/bitacora' },
                  ] as Result[])
                : []),
        ],
        [isAdmin],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Búsqueda con retardo; cancela la petición anterior.
    useEffect(() => {
        const q = query.trim();

        if (!open || q.length < 2) {
            return;
        }

        const ctrl = new AbortController();
        const t = window.setTimeout(async () => {
            setLoading(true);

            try {
                const res = await fetch(`/buscar?q=${encodeURIComponent(q)}`, {
                    signal: ctrl.signal,
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                const data = await res.json();
                setFound(data.results ?? []);
                setActive(0);
            } catch {
                // petición cancelada o sin red: se conserva lo anterior
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => {
            window.clearTimeout(t);
            ctrl.abort();
        };
    }, [query, open]);

    const searching = query.trim().length >= 2;
    const list: Result[] = searching
        ? found
        : pages.filter((p) =>
              p.title.toLowerCase().includes(query.trim().toLowerCase()),
          );

    useEffect(() => {
        listRef.current
            ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const close = () => {
        setOpen(false);
        setQuery('');
        setFound([]);
        setActive(0);
    };

    const go = (r: Result) => {
        close();
        router.visit(r.href);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, list.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter' && list[active]) {
            e.preventDefault();
            go(list[active]);
        }
    };

    let lastType: string | null = null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="bg-background text-muted-foreground hover:border-ring border-input hidden h-[38px] max-w-[480px] min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-3 text-left text-[13.5px] sm:flex"
            >
                <Search className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                    Buscar clientes, cotizaciones, oportunidades…
                </span>
                <kbd className="border-input text-muted-foreground rounded border px-1.5 py-px text-[11px] font-semibold">
                    Ctrl K
                </kbd>
            </button>
            <button
                type="button"
                aria-label="Buscar"
                onClick={() => setOpen(true)}
                className="hover:bg-accent text-muted-foreground flex size-9 items-center justify-center rounded-lg border sm:hidden"
            >
                <Search className="size-[18px]" />
            </button>

            <Dialog
                open={open}
                onOpenChange={(o) => (o ? setOpen(true) : close())}
            >
                <DialogContent
                    className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl"
                    onKeyDown={onKeyDown}
                >
                    <DialogTitle className="sr-only">
                        Búsqueda global
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Busca registros o navega a un módulo
                    </DialogDescription>
                    <div className="flex items-center gap-2.5 border-b px-4">
                        <Search className="text-muted-foreground size-4 shrink-0" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setActive(0);
                            }}
                            placeholder="Busca un cliente, cotización, oportunidad…"
                            className="placeholder:text-muted-foreground h-12 flex-1 bg-transparent pr-8 text-sm outline-none"
                        />
                    </div>

                    <div
                        ref={listRef}
                        className="max-h-[50vh] overflow-y-auto p-2"
                    >
                        {searching && loading && list.length === 0 && (
                            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                                Buscando…
                            </p>
                        )}
                        {searching && !loading && list.length === 0 && (
                            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                                Sin resultados para “{query.trim()}”.
                            </p>
                        )}
                        {list.map((r, i) => {
                            const meta = TYPE[r.type];
                            const header =
                                lastType !== r.type ? meta.label : null;
                            lastType = r.type;

                            return (
                                <div key={`${r.type}-${r.href}`}>
                                    {header && (
                                        <div className="text-muted-foreground px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide uppercase">
                                            {header}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        data-index={i}
                                        onMouseMove={() => setActive(i)}
                                        onClick={() => go(r)}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-accent' : ''}`}
                                    >
                                        <meta.icon className="text-muted-foreground size-4 shrink-0" />
                                        <span className="min-w-0 flex-1 truncate font-medium">
                                            {r.title}
                                        </span>
                                        {r.subtitle && (
                                            <span className="text-muted-foreground max-w-[40%] truncate text-xs">
                                                {r.subtitle}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-muted-foreground flex gap-4 border-t px-4 py-2 text-[11px]">
                        <span>↑↓ navegar</span>
                        <span>↵ abrir</span>
                        <span>Esc cerrar</span>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
