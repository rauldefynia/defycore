import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

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
                <div className="absolute -top-36 -right-44 size-[520px] rounded-full border border-white/10" />
                <div className="absolute -right-16 -bottom-32 size-[340px] rounded-full border border-white/10" />

                <Link
                    href={home()}
                    className="relative flex items-center gap-3 text-[22px] font-semibold tracking-tight"
                >
                    <AppLogoIcon className="size-8 text-white" />
                    {name}
                </Link>

                <div className="relative max-w-[440px]">
                    <h1 className="mb-4 text-[40px] leading-[1.15] font-semibold tracking-tight text-balance">
                        Todo tu negocio en un solo lugar.
                    </h1>
                    <p className="text-base leading-relaxed text-[#ddd3f7]">
                        Ventas, clientes, soporte, finanzas e inventario. Sin
                        módulos sueltos ni hojas de cálculo.
                    </p>
                </div>

                <div className="relative flex gap-7 text-[13px] text-[#c8b9ee]">
                    <span>Facturación CFDI 4.0</span>
                    <span>Servidores en México</span>
                    <span>Soporte en español</span>
                </div>
            </div>

            <div className="bg-card flex items-center justify-center px-8 py-14 sm:px-14">
                <div className="w-full max-w-[380px]">
                    <Link
                        href={home()}
                        className="text-primary mb-8 flex items-center gap-2.5 text-xl font-semibold lg:hidden"
                    >
                        <AppLogoIcon className="size-8" />
                        {name}
                    </Link>
                    <h2 className="mb-1.5 text-[26px] font-semibold tracking-tight">
                        {title}
                    </h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                        {description}
                    </p>
                    {children}
                </div>
            </div>
        </div>
    );
}
