import { useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tarjeta de cristal líquido: desenfoca lo que hay detrás y un brillo especular sigue al cursor
 * (se actualiza con variables CSS, sin re-renderizar React).
 */
export default function GlassCard({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    const onMove = (e: React.PointerEvent) => {
        const el = ref.current;

        if (!el) {
            return;
        }

        const r = el.getBoundingClientRect();
        el.style.setProperty('--gx', `${e.clientX - r.left}px`);
        el.style.setProperty('--gy', `${e.clientY - r.top}px`);
        el.style.setProperty('--go', '1');
    };

    return (
        <div
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={() => ref.current?.style.setProperty('--go', '0')}
            style={
                {
                    '--gx': '50%',
                    '--gy': '0%',
                    '--go': 0,
                } as React.CSSProperties
            }
            className={cn('glass-card relative overflow-hidden', className)}
        >
            {/* Brillo que persigue al cursor */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                style={{
                    opacity: 'var(--go)',
                    background:
                        'radial-gradient(260px circle at var(--gx) var(--gy), rgb(255 255 255 / 0.45), transparent 65%)',
                    mixBlendMode: 'soft-light',
                }}
            />
            {/* Reflejo superior fijo, como el borde de un vidrio */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent dark:from-white/10"
            />
            <div className="relative">{children}</div>
        </div>
    );
}
