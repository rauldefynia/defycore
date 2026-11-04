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

export function AppSidebar() {
    const { auth } = usePage().props;
    const items = mainNavItems.filter(
        (i) => !i.adminOnly || auth.user?.role === 'admin',
    );

    return (
        <Sidebar collapsible="icon" variant="sidebar">
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
