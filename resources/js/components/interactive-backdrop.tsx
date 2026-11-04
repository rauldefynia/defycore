import { useEffect, useRef } from 'react';

type Particle = { x: number; y: number; vx: number; vy: number; r: number };
type Ripple = { x: number; y: number; t: number };

const LINK = 130; // distancia máxima para unir partículas
const MOUSE_R = 190; // radio de influencia del cursor

/**
 * Fondo interactivo: red de partículas que reacciona al cursor (se unen a él y lo siguen),
 * un foco de luz que persigue el puntero, orbes con parallax y ondas al hacer clic.
 * Con `prefers-reduced-motion` sigue animado pero más lento y sin ondas; se pausa en pestañas ocultas.
 */
export default function InteractiveBackdrop() {
    const root = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const el = root.current;
        const cv = canvas.current;
        const ctx = cv?.getContext('2d');

        if (!el || !cv || !ctx) {
            return;
        }

        // Con "reducir movimiento" activo en el sistema el fondo sigue vivo pero más lento y sin ondas.
        const soft = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        const speed = soft ? 0.5 : 1;
        const mouse = { x: -9999, y: -9999, active: false };
        const ripples: Ripple[] = [];
        let particles: Particle[] = [];
        let w = 0;
        let h = 0;
        let raf = 0;

        const seed = () => {
            const count = Math.min(
                Math.max(Math.floor((w * h) / 9500), 28),
                95,
            );
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                r: Math.random() * 1.6 + 0.8,
            }));
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = el.clientWidth;
            h = el.clientHeight;
            cv.width = w * dpr;
            cv.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        };

        const frame = (dt: number) => {
            ctx.clearRect(0, 0, w, h);

            // Ondas de clic
            for (let i = ripples.length - 1; i >= 0; i--) {
                const rp = ripples[i];
                rp.t += dt;
                const p = rp.t / 900;

                if (p >= 1) {
                    ripples.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(rp.x, rp.y, p * 260, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - p)})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            for (const a of particles) {
                {
                    // Cerca del cursor las partículas son atraídas; muy encima, se apartan (efecto "vivo").
                    if (mouse.active) {
                        const dx = mouse.x - a.x;
                        const dy = mouse.y - a.y;
                        const d = Math.hypot(dx, dy);

                        if (d < MOUSE_R && d > 1) {
                            const pull = d > 55 ? 0.06 : -0.12;
                            const f = (1 - d / MOUSE_R) * pull;
                            a.vx += (dx / d) * f;
                            a.vy += (dy / d) * f;
                        }
                    }

                    // Las ondas empujan a las partículas
                    for (const rp of ripples) {
                        const dx = a.x - rp.x;
                        const dy = a.y - rp.y;
                        const d = Math.hypot(dx, dy) || 1;
                        const edge = Math.abs(d - (rp.t / 900) * 260);

                        if (edge < 30) {
                            a.vx += (dx / d) * 0.12;
                            a.vy += (dy / d) * 0.12;
                        }
                    }

                    // Fricción y velocidad máxima
                    a.vx *= 0.985;
                    a.vy *= 0.985;
                    const sp = Math.hypot(a.vx, a.vy);

                    if (sp > 1.4) {
                        a.vx = (a.vx / sp) * 1.4;
                        a.vy = (a.vy / sp) * 1.4;
                    }

                    // Deriva mínima para que nunca se detengan
                    if (sp < 0.08) {
                        a.vx += (Math.random() - 0.5) * 0.04;
                        a.vy += (Math.random() - 0.5) * 0.04;
                    }

                    a.x += a.vx * speed;
                    a.y += a.vy * speed;

                    if (a.x < -10) a.x = w + 10;
                    else if (a.x > w + 10) a.x = -10;

                    if (a.y < -10) a.y = h + 10;
                    else if (a.y > h + 10) a.y = -10;
                }
            }

            // Líneas entre partículas cercanas
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];

                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const d = Math.hypot(a.x - b.x, a.y - b.y);

                    if (d < LINK) {
                        ctx.strokeStyle = `rgba(255,255,255,${0.16 * (1 - d / LINK)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }

                // Líneas hacia el cursor
                if (mouse.active) {
                    const d = Math.hypot(a.x - mouse.x, a.y - mouse.y);

                    if (d < MOUSE_R) {
                        ctx.strokeStyle = `rgba(221,211,247,${0.5 * (1 - d / MOUSE_R)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }
            }

            // Puntos
            for (const a of particles) {
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fill();
            }
        };

        let last = performance.now();
        const loop = (now: number) => {
            const dt = Math.min(now - last, 50);
            last = now;

            if (w > 0 && h > 0 && !document.hidden) {
                frame(dt);
            }

            raf = requestAnimationFrame(loop);
        };

        const onMove = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
            mouse.active = true;

            // Foco de luz y parallax sin re-render de React
            el.style.setProperty('--mx', `${mouse.x}px`);
            el.style.setProperty('--my', `${mouse.y}px`);
            el.style.setProperty('--px', `${(mouse.x / r.width - 0.5) * 2}`);
            el.style.setProperty('--py', `${(mouse.y / r.height - 0.5) * 2}`);
        };
        const onLeave = () => {
            mouse.active = false;
            el.style.setProperty('--px', '0');
            el.style.setProperty('--py', '0');
        };
        const onDown = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 });
        };

        const ro = new ResizeObserver(resize);
        ro.observe(el);
        resize();

        // El contenedor es hijo; los eventos se escuchan en el padre (panel completo).
        const host = el.parentElement ?? el;

        host.addEventListener('pointermove', onMove);
        host.addEventListener('pointerleave', onLeave);

        if (!soft) {
            host.addEventListener('pointerdown', onDown);
        }

        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            host.removeEventListener('pointermove', onMove);
            host.removeEventListener('pointerleave', onLeave);
            host.removeEventListener('pointerdown', onDown);
        };
    }, []);

    return (
        <div
            ref={root}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={
                {
                    '--mx': '50%',
                    '--my': '50%',
                    '--px': 0,
                    '--py': 0,
                } as React.CSSProperties
            }
        >
            {/* Orbes con parallax: se desplazan en sentidos opuestos al mover el cursor */}
            <div
                className="absolute -top-20 -left-20 transition-transform duration-300 ease-out"
                style={{
                    transform:
                        'translate(calc(var(--px) * -45px), calc(var(--py) * -45px))',
                }}
            >
                <div className="size-[420px] animate-[orb-drift_16s_ease-in-out_infinite] rounded-full bg-fuchsia-500/30 blur-[90px]" />
            </div>
            <div
                className="absolute right-0 bottom-0 transition-transform duration-300 ease-out"
                style={{
                    transform:
                        'translate(calc(var(--px) * 55px), calc(var(--py) * 55px))',
                }}
            >
                <div className="size-[480px] animate-[orb-drift_20s_ease-in-out_infinite_reverse] rounded-full bg-indigo-400/30 blur-[100px]" />
            </div>
            <div className="absolute top-1/3 left-1/2 size-72 -translate-x-1/2 animate-pulse rounded-full bg-violet-300/15 blur-[80px]" />

            {/* Foco de luz que sigue al puntero */}
            <div
                className="absolute inset-0 opacity-90"
                style={{
                    background:
                        'radial-gradient(380px circle at var(--mx) var(--my), rgba(255,255,255,0.14), transparent 60%)',
                }}
            />

            <canvas ref={canvas} className="absolute inset-0 size-full" />
        </div>
    );
}
