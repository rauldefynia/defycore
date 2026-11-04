import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookUser,
    FileText,
    Kanban,
    LogIn,
    Mail,
    ScrollText,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import BrandLogo from '@/components/brand-logo';
import { dashboard, login } from '@/routes';

const FEATURES: {
    icon: LucideIcon;
    title: string;
    text: string;
    chip: string;
}[] = [
    {
        icon: FileText,
        title: 'Cotizaciones',
        text: 'Arma cotizaciones por fases con márgenes, IVA y plan de pagos, y descarga el PDF para tu cliente.',
        chip: 'bg-accent text-primary',
    },
    {
        icon: Kanban,
        title: 'Pipeline de oportunidades',
        text: 'Arrastra cada oportunidad por sus etapas hasta cerrarla como ganada y celébralo.',
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    },
    {
        icon: Users,
        title: 'Clientes y contactos',
        text: 'Un directorio único de clientes y personas que reutilizas en todos los módulos.',
        chip: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    },
    {
        icon: Mail,
        title: 'Envío por correo',
        text: 'Envía tus cotizaciones desde tu propio buzón de Microsoft 365, con el PDF adjunto.',
        chip: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
    },
    {
        icon: ShieldCheck,
        title: 'Usuarios y roles',
        text: 'Administradores con acceso total y vendedores que ven solo lo suyo.',
        chip: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    },
    {
        icon: ScrollText,
        title: 'Bitácora de movimientos',
        text: 'Auditoría de altas, cambios y accesos para saber quién hizo qué y cuándo.',
        chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
];

export default function Welcome() {
    const { auth, name } = usePage().props;
    const year = new Date().getFullYear();

    const cta = auth.user ? (
        <Link
            href={dashboard()}
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
        >
            Ir al panel <ArrowRight className="size-4" />
        </Link>
    ) : (
        <Link
            href={login()}
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
        >
            <LogIn className="size-4" /> Iniciar sesión
        </Link>
    );

    return (
        <>
            <Head title="Bienvenido" />
            <div className="bg-background text-foreground flex min-h-screen flex-col">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
                    <BrandLogo />
                    {cta}
                </header>

                <main className="flex-1">
                    {/* Hero */}
                    <section className="px-6 pt-6 pb-16 lg:pt-12">
                        <div
                            className="animate-in fade-in slide-in-from-bottom-4 relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-16 text-white duration-700 lg:px-16 lg:py-24"
                            style={{ background: 'var(--brand-gradient)' }}
                        >
                            <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl" />
                            <div className="pointer-events-none absolute -bottom-32 left-1/3 size-96 rounded-full bg-white/5 blur-3xl" />

                            <div className="relative max-w-2xl">
                                <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                                    <BookUser className="size-3.5" />
                                    Panel de ventas
                                </span>
                                <h1 className="mb-4 text-4xl font-semibold tracking-tight lg:text-5xl">
                                    Cotiza, da seguimiento y cierra más ventas
                                    con {String(name)}
                                </h1>
                                <p className="mb-8 text-base text-white/80 lg:text-lg">
                                    Clientes, contactos, cotizaciones y
                                    oportunidades en un solo lugar, con permisos
                                    por rol y el control de quién modifica qué.
                                </p>
                                <Link
                                    href={auth.user ? dashboard() : login()}
                                    className="text-primary inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold shadow-lg transition hover:bg-white/90"
                                >
                                    {auth.user ? (
                                        <>
                                            Ir al panel
                                            <ArrowRight className="size-4" />
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="size-4" />
                                            Iniciar sesión
                                        </>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* Funcionalidades */}
                    <section className="mx-auto max-w-6xl px-6 pb-20">
                        <h2 className="mb-2 text-2xl font-semibold tracking-tight">
                            Todo lo que necesitas para vender
                        </h2>
                        <p className="text-muted-foreground mb-8 text-[15px]">
                            Las herramientas del equipo comercial, en un panel
                            sencillo.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map((f, i) => (
                                <div
                                    key={f.title}
                                    style={{ animationDelay: `${i * 70}ms` }}
                                    className="bg-card animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards hover:border-ring rounded-2xl border p-5 shadow-sm transition duration-500 hover:-translate-y-0.5"
                                >
                                    <span
                                        className={`mb-4 flex size-11 items-center justify-center rounded-xl ${f.chip}`}
                                    >
                                        <f.icon className="size-5" />
                                    </span>
                                    <h3 className="mb-1 text-[15.5px] font-semibold">
                                        {f.title}
                                    </h3>
                                    <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                                        {f.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <footer className="text-muted-foreground border-t px-6 py-6 text-center text-xs">
                    © {year} {String(name)}. Acceso solo para personal
                    autorizado.
                </footer>
            </div>
        </>
    );
}
