import { router } from '@inertiajs/react';
import { Bell, CircleAlert, Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Item = {
    kind: 'danger' | 'warning';
    title: string;
    text: string;
    href: string;
};

/** Avisos de vencimientos (y accesos fallidos para admin). Se refrescan al abrir y cada 5 min. */
export function NotificationsMenu() {
    const [items, setItems] = useState<Item[]>([]);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/notificaciones', {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (res.ok) {
                setItems((await res.json()).items ?? []);
            }
        } catch {
            // sin red: se conserva lo anterior
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        load();
        const t = window.setInterval(load, 5 * 60 * 1000);

        return () => window.clearInterval(t);
    }, [load]);

    return (
        <DropdownMenu onOpenChange={(o) => o && load()}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Notificaciones"
                    className="hover:bg-accent text-muted-foreground relative flex size-9 items-center justify-center rounded-lg border"
                >
                    <Bell className="size-[18px]" />
                    {items.length > 0 && (
                        <span className="bg-destructive absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-bold text-white">
                            {items.length > 9 ? '9+' : items.length}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {loaded && items.length === 0 && (
                    <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                        Todo al día. No hay avisos pendientes.
                    </p>
                )}
                <div className="max-h-96 overflow-y-auto">
                    {items.map((n, i) => (
                        <DropdownMenuItem
                            key={`${n.href}-${i}`}
                            onSelect={() => router.visit(n.href)}
                            className="items-start gap-2.5 py-2.5"
                        >
                            {n.kind === 'danger' ? (
                                <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-500" />
                            ) : (
                                <Clock className="mt-0.5 size-4 shrink-0 text-amber-500" />
                            )}
                            <span className="min-w-0">
                                <span className="block text-[13px] font-medium">
                                    {n.title}
                                </span>
                                <span className="text-muted-foreground block text-xs break-words">
                                    {n.text}
                                </span>
                            </span>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
