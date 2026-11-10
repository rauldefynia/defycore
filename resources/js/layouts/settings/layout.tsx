import { Link } from '@inertiajs/react';
import { Palette, ShieldCheck, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    { title: 'Perfil', href: edit(), icon: UserRound },
    { title: 'Seguridad', href: editSecurity(), icon: ShieldCheck },
    { title: 'Apariencia', href: editAppearance(), icon: Palette },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6">
            <Heading
                title="Configuración"
                description="Administra tu perfil y la seguridad de tu cuenta"
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
                <aside className="w-full lg:w-52 lg:shrink-0">
                    <nav
                        className="flex gap-1 overflow-x-auto lg:flex-col"
                        aria-label="Configuración"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const active = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={`${toUrl(item.href)}-${index}`}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                                        active
                                            ? 'bg-accent text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {item.icon && (
                                        <item.icon className="size-4" />
                                    )}
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <div className="min-w-0 flex-1">
                    <section className="max-w-2xl space-y-6">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
