import { Breadcrumbs } from '@/components/breadcrumbs';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { AppTour } from '@/components/app-tour';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    useSoundEffects();

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader />
                {breadcrumbs.length > 0 && (
                    <div className="px-6 pt-5">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                )}
                {children}
                <WelcomeDialog />
                <AppTour />
            </AppContent>
        </AppShell>
    );
}
