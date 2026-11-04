import { Link } from '@inertiajs/react';
import BrandLogo from '@/components/brand-logo';
import GlassCard from '@/components/glass-card';
import InteractiveBackdrop from '@/components/interactive-backdrop';
import LaptopMockup from '@/components/laptop-mockup';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
            <div
                className="relative hidden flex-col overflow-hidden p-10 text-white lg:flex xl:p-14"
                style={{ background: 'var(--brand-gradient)' }}
            >
                <InteractiveBackdrop />

                <Link
                    href={home()}
                    className="animate-in fade-in slide-in-from-top-3 relative duration-700"
                >
                    <BrandLogo variant="onDark" className="h-10" />
                </Link>

                <div className="relative flex flex-1 flex-col justify-center gap-8 py-8">
                    <h1 className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards pointer-events-none max-w-[480px] text-[32px] leading-[1.15] font-semibold tracking-tight text-balance delay-150 duration-700 xl:text-[38px]">
                        Todo tu proceso de ventas en un solo lugar.
                    </h1>
                    <LaptopMockup />
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
