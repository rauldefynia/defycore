import { Link, usePage } from '@inertiajs/react';
import { FileText, Kanban, ShieldCheck, Users } from 'lucide-react';
import BrandLogo from '@/components/brand-logo';
import GlassCard from '@/components/glass-card';
import InteractiveBackdrop from '@/components/interactive-backdrop';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const HIGHLIGHTS = [
    { icon: FileText, label: 'Cotizaciones' },
    { icon: Kanban, label: 'Pipeline' },
    { icon: Users, label: 'Clientes y contactos' },
    { icon: ShieldCheck, label: 'Control por roles' },
];

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
            <div
                className="relative hidden flex-col justify-between overflow-hidden p-14 text-white lg:flex"
                style={{ background: 'var(--brand-gradient)' }}
            >
                <InteractiveBackdrop />

                <Link
                    href={home()}
                    className="animate-in fade-in slide-in-from-top-3 relative duration-700"
                >
                    <BrandLogo variant="onDark" className="h-10" />
                </Link>

                <div className="pointer-events-none relative max-w-[460px]">
                    <h1 className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards mb-4 text-[42px] leading-[1.12] font-semibold tracking-tight text-balance delay-150 duration-700">
                        Todo tu negocio en un solo lugar.
                    </h1>
                    <p className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-base leading-relaxed text-[#ddd3f7] delay-300 duration-700">
                        Cotiza, da seguimiento a tus oportunidades y mantén a
                        tus clientes y contactos al alcance, sin hojas de
                        cálculo sueltas.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-2.5">
                        {HIGHLIGHTS.map((h, i) => (
                            <span
                                key={h.label}
                                style={{ animationDelay: `${450 + i * 90}ms` }}
                                className="animate-in fade-in zoom-in-95 fill-mode-backwards flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-md duration-500"
                            >
                                <h.icon className="size-3.5" />
                                {h.label}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="animate-in fade-in pointer-events-none relative text-[13px] text-[#c8b9ee] delay-700 duration-1000">
                    Mueve el cursor y haz clic sobre el fondo ✦ {String(name)}
                </div>
            </div>

            <div className="relative flex items-center justify-center overflow-hidden px-8 py-14 sm:px-14">
                {/* Orbes de color detrás del cristal: sin ellos el desenfoque no se aprecia */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,var(--accent),var(--background)_60%)]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 size-[420px] animate-[orb-drift_18s_ease-in-out_infinite] rounded-full bg-fuchsia-500/45 blur-[80px]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-32 -left-24 size-[460px] animate-[orb-drift_22s_ease-in-out_infinite_reverse] rounded-full bg-violet-500/45 blur-[90px]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 animate-[orb-drift_26s_ease-in-out_infinite] rounded-full bg-indigo-400/40 blur-[80px]"
                />

                <GlassCard className="animate-in fade-in slide-in-from-bottom-6 w-full max-w-[420px] rounded-3xl p-8 duration-700 sm:p-10">
                    <Link href={home()} className="mb-8 block lg:hidden">
                        <BrandLogo className="h-9" />
                    </Link>
                    <h2 className="mb-1.5 text-[26px] font-semibold tracking-tight">
                        {title}
                    </h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                        {description}
                    </p>
                    {children}
                </GlassCard>
            </div>
        </div>
    );
}
