import { useRef } from 'react';

/**
 * Capa decorativa del menú lateral: orbes difuminados que derivan solos y un foco de luz
 * que sigue al cursor (variables --sx/--sy fijadas por el contenedor, sin re-render).
 */
export default function SidebarGlowLayer() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
            <div className="absolute -top-16 -left-16 size-56 animate-[orb-drift_18s_ease-in-out_infinite] rounded-full bg-fuchsia-500/25 blur-[60px]" />
            <div className="absolute -right-20 bottom-10 size-64 animate-[orb-drift_24s_ease-in-out_infinite_reverse] rounded-full bg-violet-400/25 blur-[70px]" />
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    opacity: 'var(--so, 0)',
                    background:
                        'radial-gradient(220px circle at var(--sx, 50%) var(--sy, 30%), rgb(255 255 255 / 0.13), transparent 70%)',
                }}
            />
        </div>
    );
}
