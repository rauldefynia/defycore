import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type FoundContact = {
    id: number;
    name: string;
    position: string | null;
    organization: string | null;
    client_id?: number | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
};

type Props = {
    onSelect: (contact: FoundContact) => void;
    /** Si es true, el nombre elegido queda visible en el campo (con botón para limpiar). */
    keepSelection?: boolean;
    /** Contactos que no deben aparecer (p. ej. los ya anexados). */
    exclude?: number[];
    placeholder?: string;
    className?: string;
};

/** Selector con búsqueda en el servidor: escribe para filtrar sin cargar todos los contactos. */
export function ContactSearch({
    onSelect,
    keepSelection = false,
    exclude = [],
    placeholder = 'Buscar contacto por nombre, empresa, correo…',
    className = '',
}: Props) {
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<string | null>(null);
    const [results, setResults] = useState<FoundContact[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const box = useRef<HTMLDivElement>(null);
    const excludeKey = exclude.join(',');

    useEffect(() => {
        if (!open) {
            return;
        }

        const ctrl = new AbortController();
        const t = window.setTimeout(
            async () => {
                setLoading(true);

                try {
                    const params = new URLSearchParams({ q: query.trim() });

                    if (excludeKey) {
                        params.set('exclude', excludeKey);
                    }

                    const res = await fetch(`/contactos/buscar?${params}`, {
                        signal: ctrl.signal,
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });
                    const data = await res.json();
                    setResults(data.contacts ?? []);
                    setActive(0);
                } catch {
                    // cancelada o sin red: se conserva lo anterior
                } finally {
                    setLoading(false);
                }
            },
            query ? 250 : 0,
        );

        return () => {
            window.clearTimeout(t);
            ctrl.abort();
        };
    }, [query, open, excludeKey]);

    // Cierra al hacer clic fuera.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);

        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const choose = (c: FoundContact) => {
        onSelect(c);
        setOpen(false);
        setQuery('');

        if (keepSelection) {
            setPicked(c.name);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter' && open && results[active]) {
            e.preventDefault();
            choose(results[active]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div ref={box} className={`relative ${className}`}>
            <div className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center gap-2 rounded-md border px-3 shadow-xs focus-within:ring-[3px]">
                <Search className="text-muted-foreground size-4 shrink-0" />
                {picked ? (
                    <>
                        <span className="min-w-0 flex-1 truncate text-sm">
                            {picked}
                        </span>
                        <button
                            type="button"
                            aria-label="Quitar selección"
                            onClick={() => {
                                setPicked(null);
                                onSelect({
                                    id: 0,
                                    name: '',
                                    position: null,
                                    organization: null,
                                    client_id: null,
                                    email: null,
                                    phone: null,
                                    mobile: null,
                                });
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-4" />
                        </button>
                    </>
                ) : (
                    <input
                        value={query}
                        placeholder={placeholder}
                        onFocus={() => setOpen(true)}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onKeyDown={onKeyDown}
                        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                )}
            </div>

            {open && !picked && (
                <div className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 shadow-lg">
                    {loading && results.length === 0 && (
                        <p className="text-muted-foreground px-3 py-3 text-center text-xs">
                            Buscando…
                        </p>
                    )}
                    {!loading && results.length === 0 && (
                        <p className="text-muted-foreground px-3 py-3 text-center text-xs">
                            {query
                                ? `Sin resultados para “${query.trim()}”.`
                                : 'No hay contactos registrados.'}
                        </p>
                    )}
                    {results.map((c, i) => (
                        <button
                            key={c.id}
                            type="button"
                            onMouseMove={() => setActive(i)}
                            onClick={() => choose(c)}
                            className={`flex w-full flex-col rounded px-3 py-1.5 text-left ${i === active ? 'bg-accent' : ''}`}
                        >
                            <span className="truncate text-sm font-medium">
                                {c.name}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                                {[c.position, c.organization, c.email]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                            </span>
                        </button>
                    ))}
                    {results.length === 10 && (
                        <p className="text-muted-foreground px-3 py-1.5 text-center text-[11px]">
                            Mostrando 10; escribe para acotar la búsqueda.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
