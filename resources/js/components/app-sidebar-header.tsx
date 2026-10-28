import { Bell, ChevronDown, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppSidebarHeader() {
    return (
        <header className="bg-card sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3.5 border-b px-4 md:px-5.5">
            <SidebarTrigger className="-ml-1" />

            <button
                type="button"
                className="bg-background text-muted-foreground hover:border-ring border-input hidden h-[38px] max-w-[480px] min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-3 text-left text-[13.5px] sm:flex"
            >
                <Search className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                    Buscar clientes, cotizaciones, productos…
                </span>
                <kbd className="border-input text-muted-foreground rounded border px-1.5 py-px text-[11px] font-semibold">
                    Ctrl K
                </kbd>
            </button>

            <div className="flex-1" />

            <Button className="gap-1.5 font-semibold">
                <Plus />
                Crear
            </Button>

            <button
                type="button"
                aria-label="Notificaciones"
                className="hover:bg-accent text-muted-foreground relative flex size-9 items-center justify-center rounded-lg border"
            >
                <Bell className="size-[18px]" />
                <span className="bg-destructive absolute top-1.5 right-2 size-[7px] rounded-full" />
            </button>

            <button
                type="button"
                className="hover:bg-accent hidden items-center gap-2 rounded-lg border py-1.5 pr-2.5 pl-2 md:flex"
            >
                <span
                    className="flex size-[22px] items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ background: 'var(--brand-gradient)' }}
                >
                    TM
                </span>
                <span className="text-[13px] font-medium">Tecnomex</span>
                <ChevronDown className="text-muted-foreground size-3" />
            </button>
        </header>
    );
}
