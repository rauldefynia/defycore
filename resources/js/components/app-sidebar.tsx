import { Link } from '@inertiajs/react';
import {
    Landmark,
    LifeBuoy,
    ChartLine,
    Package,
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

// Los módulos aún no tienen ruta: solo se muestra el diseño.
const mainNavItems: NavItem[] = [
    { title: 'Inicio', href: dashboard(), icon: LayoutGrid },
    { title: 'Ventas', href: '', icon: ChartLine },
    { title: 'Clientes', href: '', icon: Users },
    { title: 'Soporte', href: '', icon: LifeBuoy },
    { title: 'Finanzas', href: '', icon: Landmark },
    { title: 'Inventario', href: '', icon: Package },
    { title: 'Accesos', href: '', icon: ShieldCheck },
];

export function AppSidebar() {
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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border border-t">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
