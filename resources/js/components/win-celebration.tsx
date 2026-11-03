import { Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type Celebration = { id: number; name: string; amount?: string };

const COLORS = [
    '#6d28d9',
    '#a78bfa',
    '#c4b5fd',
    '#22c55e',
    '#facc15',
    '#f59e0b',
    '#38bdf8',
    '#f472b6',
];

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rot: number;
    vr: number;
    life: number;
    round: boolean;
};

/** Dispara confeti desde ambas esquinas inferiores y una lluvia superior. */
function Confetti({ duration = 3600 }: { duration?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const particles: Particle[] = [];
        const rand = (a: number, b: number) => a + Math.random() * (b - a);
        const make = (x: number, y: number, angle: number, speed: number) =>
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed + rand(-2, 2),
                vy: Math.sin(angle) * speed + rand(-2, 2),
                size: rand(6, 12),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                rot: rand(0, Math.PI * 2),
                vr: rand(-0.3, 0.3),
                life: 0,
                round: Math.random() < 0.3,
            });

        // Cañones laterales
        for (let i = 0; i < 90; i++) {
            make(0, h, -Math.PI / 3 + rand(-0.35, 0.35), rand(14, 28));
            make(w, h, (-2 * Math.PI) / 3 + rand(-0.35, 0.35), rand(14, 28));
        }

        // Lluvia superior escalonada
        const rain = window.setInterval(() => {
            for (let i = 0; i < 6; i++) {
                make(
                    rand(0, w),
                    -10,
                    Math.PI / 2 + rand(-0.4, 0.4),
                    rand(2, 6),
                );
            }
        }, 90);
        const stopRain = window.setTimeout(
            () => window.clearInterval(rain),
            1600,
        );

        const start = performance.now();
        let raf = 0;

        const frame = (now: number) => {
            ctx.clearRect(0, 0, w, h);
            const elapsed = now - start;

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.vy += 0.45; // gravedad
                p.vx *= 0.985; // resistencia del aire
                p.vy *= 0.985;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vr;
                p.life += 1;

                const fade = Math.max(
                    1 - Math.max(elapsed - (duration - 900), 0) / 900,
                    0,
                );

                if (p.y > h + 30 || fade <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = fade;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;

                if (p.round) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // el ancho oscila para simular el giro en 3D
                    ctx.fillRect(
                        -p.size / 2,
                        (-p.size / 4) * Math.abs(Math.cos(p.life / 6)),
                        p.size,
                        (p.size / 2) * Math.abs(Math.cos(p.life / 6)) + 1,
                    );
                }

                ctx.restore();
            }

            if (elapsed < duration && (particles.length || elapsed < 1700)) {
                raf = requestAnimationFrame(frame);
            } else {
                ctx.clearRect(0, 0, w, h);
            }
        };

        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            window.clearInterval(rain);
            window.clearTimeout(stopRain);
        };
    }, [duration]);

    return (
        <canvas
            ref={ref}
            className="pointer-events-none fixed inset-0 z-[100] h-screen w-screen"
            aria-hidden
        />
    );
}

function WinOverlay({
    data,
    onDone,
}: {
    data: Celebration;
    onDone: () => void;
}) {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const t1 = window.setTimeout(() => setLeaving(true), 3400);
        const t2 = window.setTimeout(onDone, 3900);

        return () => {
            window.clearTimeout(t1);
            window.clearTimeout(t2);
        };
    }, [onDone]);

    const close = () => {
        setLeaving(true);
        window.setTimeout(onDone, 300);
    };

    return (
        <>
            <Confetti />
            <div
                className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center p-4"
                role="status"
                aria-live="polite"
            >
                <button
                    type="button"
                    onClick={close}
                    className={`bg-card pointer-events-auto relative max-w-sm overflow-hidden rounded-3xl border px-9 py-8 text-center shadow-2xl transition-all duration-500 ${leaving ? 'scale-95 opacity-0' : 'animate-in zoom-in-75 fade-in duration-500'}`}
                >
                    <span
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{ background: 'var(--brand-gradient)' }}
                    />
                    <span className="relative mx-auto mb-4 flex size-20 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/40" />
                        <span className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-lg">
                            <Trophy className="size-10 animate-bounce" />
                        </span>
                    </span>
                    <h2 className="text-primary text-3xl font-bold tracking-tight">
                        ¡Felicidades!
                    </h2>
                    <p className="text-muted-foreground mt-1.5 text-sm">
                        Oportunidad ganada
                    </p>
                    <p className="mt-3 text-base font-semibold">{data.name}</p>
                    {data.amount && (
                        <p className="mt-1 text-2xl font-bold tracking-tight text-green-600 tabular-nums dark:text-green-400">
                            {data.amount}
                        </p>
                    )}
                </button>
            </div>
        </>
    );
}

/** `celebrate(nombre, monto)` lanza la animación; `node` se renderiza una vez en la página. */
export function useWinCelebration() {
    const [current, setCurrent] = useState<Celebration | null>(null);

    const celebrate = useCallback((name: string, amount?: string) => {
        setCurrent({ id: Date.now(), name, amount });
    }, []);

    const node = current ? (
        <WinOverlay
            key={current.id}
            data={current}
            onDone={() => setCurrent(null)}
        />
    ) : null;

    return { celebrate, node };
}
