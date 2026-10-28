import { Head, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ChartLine,
    CheckCircle2,
    Circle,
    FilePlus,
    Kanban,
    Landmark,
    LifeBuoy,
    Lock,
    Package,
    PhoneCall,
    Receipt,
    Send,
    TriangleAlert,
    UserPlus,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { dashboard } from '@/routes';

type Tone = 'primary' | 'info' | 'danger' | 'success' | 'warning' | 'muted';

// Colores semánticos del diseño: [fondo suave + color], [solo color]
const tones: Record<Tone, { chip: string; text: string }> = {
    primary: { chip: 'bg-accent text-primary', text: 'text-primary' },
    info: {
        chip: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
        text: 'text-blue-600 dark:text-blue-400',
    },
    danger: {
        chip: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
        text: 'text-red-600 dark:text-red-400',
    },
    success: {
        chip: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
        text: 'text-green-600 dark:text-green-400',
    },
    warning: {
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        text: 'text-amber-600 dark:text-amber-400',
    },
    muted: {
        chip: 'bg-secondary text-muted-foreground',
        text: 'text-muted-foreground',
    },
};

// Datos de ejemplo: los módulos aún no tienen lógica, solo diseño.
const activities: {
    icon: LucideIcon;
    tone: Tone;
    title: string;
    meta: string;
    when: string;
}[] = [
    {
        icon: PhoneCall,
        tone: 'primary',
        title: 'Llamar a Ing. Rodrigo Cárdenas',
        meta: 'Grupo Industrial Morelos · seguimiento COT-2026-0142',
        when: '10:00',
    },
    {
        icon: Send,
        tone: 'info',
        title: 'Enviar propuesta de enlace dedicado',
        meta: 'Logística Integral de Occidente',
        when: '13:30',
    },
    {
        icon: TriangleAlert,
        tone: 'danger',
        title: 'Ticket SOP-2026-0318 sin respuesta',
        meta: 'Alimentos Santa Rosa · SLA vence en 3 h',
        when: 'Vencida',
    },
];

const checklist = [
    { label: 'Carga los datos fiscales de tu empresa', done: true },
    { label: 'Invita a tu equipo', done: true },
    { label: 'Importa tu catálogo de productos', done: true },
    { label: 'Conecta tu cuenta de correo', done: false },
    { label: 'Crea tu primera cotización', done: false },
];

const modules: {
    label: string;
    icon: LucideIcon;
    tone: Tone;
    live: string;
    pro?: boolean;
    locked?: boolean;
}[] = [
    {
        label: 'Ventas',
        icon: ChartLine,
        tone: 'primary',
        live: '12 cotizaciones abiertas · $2,184,300.00 en pipeline',
    },
    {
        label: 'Clientes',
        icon: Users,
        tone: 'info',
        live: '248 cuentas activas · 9 sin contacto en 30 días',
    },
    {
        label: 'Soporte',
        icon: LifeBuoy,
        tone: 'danger',
        live: '5 tickets urgentes · SLA en riesgo en 2',
    },
    {
        label: 'Finanzas',
        icon: Landmark,
        tone: 'success',
        live: '$412,980.00 por cobrar · 3 facturas vencidas',
    },
    {
        label: 'Inventario',
        icon: Package,
        tone: 'warning',
        live: '1,284 SKU · 7 productos bajo mínimo',
        pro: true,
    },
    {
        label: 'Accesos',
        icon: Lock,
        tone: 'muted',
        live: 'No tienes permiso. Pide acceso a tu administrador.',
        locked: true,
    },
];

const quickLinks: { label: string; icon: LucideIcon }[] = [
    { label: 'Nueva cotización', icon: FilePlus },
    { label: 'Registrar cliente', icon: UserPlus },
    { label: 'Abrir pipeline', icon: Kanban },
    { label: 'Facturas por cobrar', icon: Receipt },
];

const card = 'bg-card rounded-xl border shadow-sm';

function greeting() {
    const h = new Date().getHours();

    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Dashboard() {
    const { auth } = usePage().props;
    const firstName = auth.user?.name?.split(' ')[0] ?? '';
    const today = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

    return (
        <>
            <Head title="Inicio" />
            <div className="flex max-w-[1320px] flex-col gap-6 px-6 pt-4 pb-11">
                <div>
                    <h1 className="mb-1 text-[28px] font-semibold tracking-tight">
                        {greeting()}, {firstName}
                    </h1>
                    <p className="text-muted-foreground text-[14.5px] first-letter:uppercase">
                        {today} · Tienes {activities.length} actividades para
                        hoy.
                    </p>
                </div>

                <div className="grid gap-4.5 lg:grid-cols-[1.15fr_1fr]">
                    <div className={`${card} px-5 py-4.5`}>
                        <div className="mb-3.5 flex items-center justify-between">
                            <h2 className="text-[15px] font-semibold">
                                Mis actividades de hoy
                            </h2>
                            <span className="text-primary text-[13px] font-medium">
                                Ver todas
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {activities.map((a) => (
                                <div
                                    key={a.title}
                                    className="hover:bg-secondary flex items-center gap-3 rounded-lg px-2 py-2.5"
                                >
                                    <span
                                        className={`flex size-[30px] shrink-0 items-center justify-center rounded-lg ${tones[a.tone].chip}`}
                                    >
                                        <a.icon className="size-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13.5px] font-medium">
                                            {a.title}
                                        </div>
                                        <div className="text-muted-foreground text-[12.5px]">
                                            {a.meta}
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs font-semibold whitespace-nowrap ${tones[a.tone].text}`}
                                    >
                                        {a.when}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className="flex flex-col rounded-xl px-5 py-4.5 text-white"
                        style={{ background: 'var(--brand-gradient)' }}
                    >
                        <div className="mb-1.5 flex items-center justify-between">
                            <h2 className="text-[15px] font-semibold">
                                Configura Defynia
                            </h2>
                            <span className="text-[12.5px] text-[#d9cdf5]">
                                3 de 5 listos
                            </span>
                        </div>
                        <div className="mb-3.5 h-[5px] overflow-hidden rounded-full bg-white/20">
                            <div className="h-full w-3/5 rounded-full bg-white" />
                        </div>
                        <div className="flex flex-col">
                            {checklist.map((k) => (
                                <div
                                    key={k.label}
                                    className="flex items-center gap-2.5 py-1.5"
                                >
                                    {k.done ? (
                                        <CheckCircle2 className="size-[17px] text-[#c4f0d1]" />
                                    ) : (
                                        <Circle className="size-[17px] text-white/50" />
                                    )}
                                    <span
                                        className={`flex-1 text-[13.5px] ${k.done ? 'text-[#c0b2e4] line-through' : ''}`}
                                    >
                                        {k.label}
                                    </span>
                                    {!k.done && (
                                        <ArrowRight className="size-3.5 text-[#d9cdf5]" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-base font-semibold">Módulos</h2>
                        <span className="text-muted-foreground text-[13px]">
                            Tecnomex del Centro S.A. de C.V.
                        </span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
                        {modules.map((m) => (
                            <div
                                key={m.label}
                                className={`${card} hover:border-ring flex min-h-[138px] flex-col gap-3 p-4.5 transition hover:-translate-y-0.5 ${m.locked ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <span
                                        className={`flex size-10 items-center justify-center rounded-[10px] ${tones[m.tone].chip}`}
                                    >
                                        <m.icon className="size-[21px]" />
                                    </span>
                                    {m.locked && (
                                        <Lock className="text-muted-foreground size-4" />
                                    )}
                                    {m.pro && (
                                        <span className="border-ring text-primary rounded-full border px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide">
                                            PRO
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <div className="mb-0.5 text-[15.5px] font-semibold">
                                        {m.label}
                                    </div>
                                    <div className="text-muted-foreground text-[13px] leading-snug">
                                        {m.live}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="mb-3 text-base font-semibold">
                        Accesos rápidos
                    </h2>
                    <div className="flex flex-wrap gap-2.5">
                        {quickLinks.map((q) => (
                            <button
                                key={q.label}
                                type="button"
                                className="bg-card hover:border-ring hover:bg-secondary flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13.5px] font-medium"
                            >
                                <q.icon className="text-primary size-[17px]" />
                                {q.label}
                            </button>
                        ))}
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
