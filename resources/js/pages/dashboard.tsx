import { Head, Link, usePage } from '@inertiajs/react';
import {
    BookUser,
    ChartNoAxesCombined,
    FilePlus,
    FileText,
    Kanban,
    ScrollText,
    ShieldCheck,
    UserCog,
    UserPlus,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { dashboard } from '@/routes';
import { formatMoney } from '@/lib/quote-calc';

type Props = {
    stats: {
        quotes: number;
        quotes_month: number;
        clients: number;
        contacts: number;
        opportunities_open: number;
        opportunities_won: number;
        users: number | null;
        activity_today: number | null;
    };
    recentQuotes: {
        id: number;
        number: string;
        name: string;
        client: string | null;
        currency: string;
        total: number;
    }[];
};

const card = 'bg-card rounded-xl border shadow-sm';

function greeting() {
    const h = new Date().getHours();

    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Dashboard({ stats, recentQuotes }: Props) {
    const { auth } = usePage().props;
    const firstName = auth.user?.name?.split(' ')[0] ?? '';
    const today = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

    const modules: {
        label: string;
        href: string;
        icon: LucideIcon;
        chip: string;
        live: string;
    }[] = [
        {
            label: 'Oportunidades',
            href: '/oportunidades',
            icon: Kanban,
            chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
            live: `${stats.opportunities_open} abiertas · ${stats.opportunities_won} ganadas`,
        },
        {
            label: 'Cotizaciones',
            href: '/cotizaciones',
            icon: FileText,
            chip: 'bg-accent text-primary',
            live: `${stats.quotes} cotizaciones · ${stats.quotes_month} este mes`,
        },
        {
            label: 'Clientes',
            href: '/clientes',
            icon: Users,
            chip: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
            live: `${stats.clients} clientes registrados`,
        },
        {
            label: 'Contactos',
            href: '/contactos',
            icon: BookUser,
            chip: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
            live: `${stats.contacts} contactos · reutilízalos en cotizaciones`,
        },
        {
            label: 'Gráficas',
            href: '/graficas',
            icon: ChartNoAxesCombined,
            chip: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
            live: 'Ventas, cotizaciones y pipeline con filtros',
        },
        // Sólo administradores (el servidor envía `users: null` a los vendedores).
        ...(stats.users !== null
            ? [
                  {
                      label: 'Usuarios',
                      href: '/usuarios',
                      icon: ShieldCheck,
                      chip: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
                      live: `${stats.users} usuarios activos · administra accesos`,
                  },
                  {
                      label: 'Bitácora',
                      href: '/bitacora',
                      icon: ScrollText,
                      chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                      live: `${stats.activity_today ?? 0} movimientos hoy · auditoría del sistema`,
                  },
              ]
            : []),
    ];

    const quickLinks: { label: string; href: string; icon: LucideIcon }[] = [
        {
            label: 'Nueva cotización',
            href: '/cotizaciones/nueva',
            icon: FilePlus,
        },
        { label: 'Nuevo cliente', href: '/clientes/nuevo', icon: UserPlus },
        { label: 'Nuevo contacto', href: '/contactos/nuevo', icon: BookUser },
        { label: 'Ver pipeline', href: '/oportunidades', icon: Kanban },
        ...(stats.users !== null
            ? [
                  {
                      label: 'Nuevo usuario',
                      href: '/usuarios/nuevo',
                      icon: UserCog,
                  },
                  {
                      label: 'Ver bitácora',
                      href: '/bitacora',
                      icon: ScrollText,
                  },
              ]
            : []),
    ];

    return (
        <>
            <Head title="Inicio" />
            <div className="flex max-w-[1320px] flex-col gap-6 px-6 pt-4 pb-11">
                <div>
                    <h1 className="mb-1 text-[28px] font-semibold tracking-tight">
                        {greeting()}, {firstName}
                    </h1>
                    <p className="text-muted-foreground text-[14.5px] first-letter:uppercase">
                        {today}
                    </p>
                </div>

                <div>
                    <h2 className="mb-3 text-base font-semibold">Módulos</h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
                        {modules.map((m) => (
                            <Link
                                key={m.label}
                                href={m.href}
                                prefetch
                                className={`${card} hover:border-ring flex min-h-[138px] flex-col gap-3 p-4.5 transition hover:-translate-y-0.5`}
                            >
                                <span
                                    className={`flex size-10 items-center justify-center rounded-[10px] ${m.chip}`}
                                >
                                    <m.icon className="size-[21px]" />
                                </span>
                                <div>
                                    <div className="mb-0.5 text-[15.5px] font-semibold">
                                        {m.label}
                                    </div>
                                    <div className="text-muted-foreground text-[13px] leading-snug">
                                        {m.live}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4.5 lg:grid-cols-[1.4fr_1fr]">
                    <div className={`${card} px-5 py-4.5`}>
                        <div className="mb-3.5 flex items-center justify-between">
                            <h2 className="text-[15px] font-semibold">
                                Últimas cotizaciones
                            </h2>
                            <Link
                                href="/cotizaciones"
                                className="text-primary text-[13px] font-medium"
                            >
                                Ver todas
                            </Link>
                        </div>
                        {recentQuotes.length === 0 ? (
                            <p className="text-muted-foreground py-6 text-center text-sm">
                                Aún no has creado cotizaciones.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-0.5">
                                {recentQuotes.map((q) => (
                                    <Link
                                        key={q.id}
                                        href={`/cotizaciones/${q.id}/editar`}
                                        className="hover:bg-secondary flex items-center gap-3 rounded-lg px-2 py-2.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[13.5px] font-medium">
                                                {q.name}
                                            </div>
                                            <div className="text-muted-foreground truncate text-[12.5px]">
                                                {q.number} ·{' '}
                                                {q.client ?? 'Sin cliente'}
                                            </div>
                                        </div>
                                        <span className="text-[13.5px] font-semibold whitespace-nowrap">
                                            {formatMoney(q.total, q.currency)}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="mb-3 text-base font-semibold">
                            Accesos rápidos
                        </h2>
                        <div className="flex flex-wrap gap-2.5">
                            {quickLinks.map((q) => (
                                <Link
                                    key={q.label}
                                    href={q.href}
                                    className="bg-card hover:border-ring hover:bg-secondary flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13.5px] font-medium"
                                >
                                    <q.icon className="text-primary size-[17px]" />
                                    {q.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Inicio',
            href: dashboard(),
        },
    ],
};
