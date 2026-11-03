import { cn } from '@/lib/utils';

/** Logotipo oficial de Microsoft (cuatro cuadros). */
export function MicrosoftLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 23 23"
            className={cn('size-4 shrink-0', className)}
            aria-hidden
        >
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
    );
}

/**
 * Enlace (navegación completa, no Inertia) al flujo OAuth de Microsoft 365.
 * Debe ser un <a>: la ruta responde con una redirección externa a login.microsoftonline.com.
 */
export default function MicrosoftButton({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <a
            href="/auth/microsoft/redirect"
            className={cn(
                'border-input bg-background hover:bg-secondary inline-flex h-9 w-full items-center justify-center gap-2.5 rounded-md border px-4 text-sm font-medium shadow-xs transition',
                className,
            )}
        >
            <MicrosoftLogo />
            {children}
        </a>
    );
}
