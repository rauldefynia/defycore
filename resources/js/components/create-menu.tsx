import { router, usePage } from '@inertiajs/react';
import {
    BookUser,
    FileText,
    Kanban,
    Plus,
    UserPlus,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Auth } from '@/types';

/** Accesos rápidos para crear registros nuevos. */
export function CreateMenu() {
    const { auth } = usePage<{ auth: Auth }>().props;

    const options = [
        {
            label: 'Nueva cotización',
            icon: FileText,
            href: '/cotizaciones/nueva',
        },
        { label: 'Nuevo cliente', icon: Users, href: '/clientes/nuevo' },
        { label: 'Nuevo contacto', icon: BookUser, href: '/contactos/nuevo' },
        {
            label: 'Nueva oportunidad',
            icon: Kanban,
            href: '/oportunidades?nueva=1',
        },
        ...(auth.user?.role === 'admin'
            ? [
                  {
                      label: 'Nuevo usuario',
                      icon: UserPlus,
                      href: '/usuarios/nuevo',
                  },
              ]
            : []),
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="gap-1.5 font-semibold">
                    <Plus />
                    Crear
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {options.map((o) => (
                    <DropdownMenuItem
                        key={o.href}
                        onSelect={() => router.visit(o.href)}
                        className="gap-2.5"
                    >
                        <o.icon className="size-4" />
                        {o.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
