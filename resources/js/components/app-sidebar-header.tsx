import { CircleHelp, Volume2, VolumeX } from 'lucide-react';
import { START_TOUR_EVENT } from '@/components/app-tour';
import { CreateMenu } from '@/components/create-menu';
import { GlobalSearch } from '@/components/global-search';
import { NotificationsMenu } from '@/components/notifications-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useMuted } from '@/hooks/use-sound-effects';
import { setMuted } from '@/lib/sound';

export function AppSidebarHeader() {
    const muted = useMuted();

    return (
        <header className="bg-card sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3.5 border-b px-4 md:px-5.5">
            <SidebarTrigger className="-ml-1" />

            <GlobalSearch />

            <div className="flex-1" />

            <CreateMenu />

            <button
                type="button"
                aria-label="Ver tutorial"
                title="Ver tutorial"
                onClick={() =>
                    window.dispatchEvent(new Event(START_TOUR_EVENT))
                }
                className="hover:bg-accent text-muted-foreground flex size-9 items-center justify-center rounded-lg border"
            >
                <CircleHelp className="size-[18px]" />
            </button>

            <button
                type="button"
                data-sound="off"
                aria-label={muted ? 'Activar sonidos' : 'Silenciar sonidos'}
                title={muted ? 'Activar sonidos' : 'Silenciar sonidos'}
                onClick={() => setMuted(!muted)}
                className="hover:bg-accent text-muted-foreground flex size-9 items-center justify-center rounded-lg border"
            >
                {muted ? (
                    <VolumeX className="size-[18px]" />
                ) : (
                    <Volume2 className="size-[18px]" />
                )}
            </button>

            <NotificationsMenu />
        </header>
    );
}
