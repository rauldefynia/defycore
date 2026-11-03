import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

/**
 * Logo completo (escudo + nombre).
 * - `onDark`: texto blanco, para fondos oscuros (sidebar, panel morado).
 * - `auto`: texto oscuro en tema claro y blanco en tema oscuro.
 */
export default function BrandLogo({
    variant = 'auto',
    className,
}: {
    variant?: 'onDark' | 'auto';
    className?: string;
}) {
    const { name } = usePage().props;

    if (variant === 'onDark') {
        return (
            <img
                src="/logo.png"
                alt={String(name)}
                className={cn('h-8 w-auto', className)}
            />
        );
    }

    return (
        <>
            <img
                src="/logo-dark.png"
                alt={String(name)}
                className={cn('h-8 w-auto dark:hidden', className)}
            />
            <img
                src="/logo.png"
                alt={String(name)}
                className={cn('hidden h-8 w-auto dark:block', className)}
            />
        </>
    );
}
