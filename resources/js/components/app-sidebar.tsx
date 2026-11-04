import { Link, usePage } from '@inertiajs/react';
import {
    BookUser,
    FileText,
    Kanban,
    ScrollText,
    ShieldCheck,
    LayoutGrid,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import SidebarGlowLayer from '@/components/sidebar-glow-layer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

// Los módulos sin ruta solo muestran el diseño. dminOnly los oculta a los vendedores.
const mainNavItems: NavItem[] = [
    { title: 'Inicio', href: dashboard(), icon: LayoutGrid },
    { title: 'Oportunidades', href: '/oportunidades', icon: Kanban },
    { title: 'Cotizaciones', href: '/cotizaciones', icon: FileText },
    { title: 'Clientes', href: '/clientes', icon: Users },
    { title: 'Contactos', href: '/contactos', icon: BookUser },
    {
        title: 'Usuarios',
        href: '/usuarios',
        icon: ShieldCheck,
        adminOnly: true,
    },
    { title: 'Bitácora', href: '/bitacora', icon: ScrollText, adminOnly: true },
];

/** Guarda la posición del cursor: foco general del menú y brillo de la opción bajo el puntero. */
function trackPointer(e: React.PointerEvent<HTMLElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--sx', `${e.clientX - box.left}px`);
    e.currentTarget.style.setProperty('--sy', `${e.clientY - box.top}px`);
    e.currentTarget.style.setProperty('--so', '1');

    const btn = (e.target as HTMLElement).closest<HTMLElement>(
        '[data-slot="sidebar-menu-button"]',
    );

    if (btn) {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--bx', `${e.clientX - r.left}px`);
        btn.style.setProperty('--by', `${e.clientY - r.top}px`);
    }
}

function clearPointer(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.style.setProperty('--so', '0');
}

export function AppSidebar() {
    const { auth } = usePage().props;
    const items = mainNavItems.filter(
        (i) => !i.adminOnly || auth.user?.role === 'admin',
    );

    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            onPointerMove={trackPointer}
            onPointerLeave={clearPointer}
        >
            <SidebarGlowLayer />
            <SidebarHeader className="border-sidebar-border h-[60px] justify-center border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-3">
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border border-t">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
