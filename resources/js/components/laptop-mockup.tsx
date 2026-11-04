import {
    BookUser,
    Check,
    ChartNoAxesCombined,
    FileText,
    Kanban,
    LayoutGrid,
    Mail,
    Paperclip,
    Search,
    Send,
    Trophy,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Tamaño del "escenario" de la pantalla; se escala para ajustarse al ancho disponible. */
const STAGE_W = 640;
const STAGE_H = 400;
const INTERVAL = 5200;

const stage = (delay: number) => ({ animationDelay: `${delay}ms` });

/* --------------------------------------------------------------------- */
/*  Pantallas                                                            */
/* --------------------------------------------------------------------- */

function Card({
    title,
    amount,
    style,
    className,
}: {
    title: string;
    amount: string;
    style?: React.CSSProperties;
    className?: string;
}) {
    return (
        <div
            style={style}
            className={cn(
                'rounded-lg border border-slate-200 bg-white p-2 shadow-sm',
                className,
            )}
        >
            <p className="truncate text-[10px] font-semibold text-slate-700">
                {title}
            </p>
            <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-violet-700">
                    {amount}
                </span>
                <span className="size-3.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
            </div>
        </div>
    );
}

function PipelineScreen() {
    const cols = [
        { name: 'Oportunidad', color: '#94a3b8' },
        { name: 'Calificado', color: '#60a5fa' },
        { name: 'Presentado', color: '#f59e0b' },
        { name: 'Ganado', color: '#16a34a' },
    ];

    return (
        <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-800">
                    Oportunidades
                </p>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
                    Pipeline · $851K
                </span>
            </div>

            <div className="flex gap-2">
                {cols.map((c, ci) => (
                    <div
                        key={c.name}
                        style={{ width: 124 }}
                        className={cn(
                            'relative flex flex-col gap-2 rounded-xl p-2',
                            c.name === 'Ganado'
                                ? 'border border-green-200 bg-green-50'
                                : 'bg-slate-100/80',
                        )}
                    >
                        <div className="flex items-center gap-1.5">
                            <span
                                className="size-2 rounded-full"
                                style={{ background: c.color }}
                            />
                            <span className="text-[10px] font-semibold text-slate-600">
                                {c.name}
                            </span>
                        </div>

                        {ci === 0 && (
                            <>
                                <Card title="Portal web" amount="$85K" />
                                <Card
                                    title="Renovación licencias"
                                    amount="$120K"
                                />
                            </>
                        )}
                        {ci === 1 && (
                            <>
                                <Card
                                    title="Red de sucursales"
                                    amount="$240K"
                                />
                                <Card title="Cámaras y acceso" amount="$64K" />
                            </>
                        )}
                        {ci === 2 && (
                            <>
                                {/* Esta tarjeta viaja a "Ganado" */}
                                <Card
                                    title="Suite de seguridad"
                                    amount="$310K"
                                    className="relative z-10 border-amber-300"
                                    style={{
                                        animation:
                                            'mock-travel 1.8s 1.1s cubic-bezier(.4,0,.2,1) forwards',
                                    }}
                                />
                                <Card title="Cotización lista" amount="$132K" />
                            </>
                        )}
                        {ci === 3 && (
                            <>
                                <div className="flex h-[42px] items-center justify-center rounded-lg border border-dashed border-green-400 text-[9px] font-medium text-green-600">
                                    Suelta aquí
                                </div>
                                <Card title="Soporte anual" amount="$96K" />
                                <span
                                    style={{
                                        animation:
                                            'mock-pop 0.5s 2.9s cubic-bezier(.2,1.4,.4,1) both',
                                    }}
                                    className="absolute -top-2.5 -right-2 flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-[9px] font-bold text-white shadow-lg"
                                >
                                    <Trophy className="size-3" /> ¡Ganado!
                                    +$310K
                                </span>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function QuoteScreen() {
    const rows = [
        ['Licencias anuales (x25)', '$62,500'],
        ['Implementación y capacitación', '$18,000'],
        ['Soporte premium 12 meses', '$24,000'],
    ];

    return (
        <div className="flex h-full flex-col gap-3">
            <p className="text-[13px] font-bold text-slate-800">Cotizaciones</p>
            <div className="flex flex-1 gap-3">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="mb-3 flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-violet-800">
                                Cotización PRE-2026-0412
                            </p>
                            <p className="text-[9px] text-slate-500">
                                Grupo Industrial Morelos · 04 nov 2026
                            </p>
                        </div>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[8px] font-semibold text-green-700">
                            Vigente
                        </span>
                    </div>

                    <div className="divide-y divide-slate-100 text-[10px]">
                        {rows.map(([d, a], i) => (
                            <div
                                key={d}
                                style={stage(250 + i * 180)}
                                className="animate-in fade-in slide-in-from-left-3 fill-mode-backwards flex justify-between py-1.5 duration-500"
                            >
                                <span className="text-slate-600">{d}</span>
                                <span className="font-semibold text-slate-800">
                                    {a}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 ml-auto w-44 text-[10px]">
                        <div className="flex justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span>$104,500</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                            <span>IVA 16%</span>
                            <span>$16,720</span>
                        </div>
                        <div
                            style={stage(900)}
                            className="animate-in zoom-in-95 fill-mode-backwards mt-1.5 flex justify-between rounded-lg bg-violet-700 px-2 py-1.5 text-[11px] font-bold text-white duration-500"
                        >
                            <span>Total</span>
                            <span>$121,220</span>
                        </div>
                    </div>
                </div>

                <div
                    style={stage(500)}
                    className="animate-in fade-in slide-in-from-right-4 fill-mode-backwards relative w-[190px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm duration-600"
                >
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                        <Mail className="size-3.5 text-violet-600" /> Enviar por
                        correo
                    </p>
                    <div className="space-y-1.5 text-[9px]">
                        <div className="rounded-md bg-slate-100 px-2 py-1.5 text-slate-600">
                            compras@morelos.mx
                        </div>
                        <div className="rounded-md bg-slate-100 px-2 py-1.5 text-slate-600">
                            Cotización de licencias
                        </div>
                        <div className="flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 font-medium text-violet-700">
                            <Paperclip className="size-3" /> PRE-2026-0412.pdf
                        </div>
                    </div>
                    <div
                        style={{
                            animation: 'mock-press 0.5s 2.4s ease both',
                        }}
                        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-violet-700 py-1.5 text-[10px] font-semibold text-white"
                    >
                        <Send className="size-3" /> Enviar
                    </div>
                    <span
                        style={{
                            animation:
                                'mock-pop 0.5s 3s cubic-bezier(.2,1.4,.4,1) both',
                        }}
                        className="absolute -right-2 -bottom-3 flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-[9px] font-bold text-white shadow-lg"
                    >
                        <Check className="size-3" /> Enviado
                    </span>
                </div>
            </div>
        </div>
    );
}

function ChartsScreen() {
    const kpis = [
        ['Total cotizado', '$2.4M', '+12.4%'],
        ['Ventas ganadas', '$1.1M', '+8.1%'],
        ['Tasa de cierre', '64%', '+5.0%'],
        ['Pipeline abierto', '$3.2M', '+2.3%'],
    ];
    const bars = [
        [42, 20],
        [55, 28],
        [48, 31],
        [70, 40],
        [64, 45],
        [88, 58],
    ];

    return (
        <div className="flex h-full flex-col gap-3">
            <p className="text-[13px] font-bold text-slate-800">Gráficas</p>
            <div className="grid grid-cols-4 gap-2">
                {kpis.map(([l, v, d], i) => (
                    <div
                        key={l}
                        style={stage(i * 110)}
                        className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm duration-500"
                    >
                        <p className="text-[8px] text-slate-500">{l}</p>
                        <p className="text-[15px] font-bold text-slate-800">
                            {v}
                        </p>
                        <p className="text-[8px] font-semibold text-green-600">
                            ▲ {d}
                        </p>
                    </div>
                ))}
            </div>

            <div className="flex flex-1 gap-2">
                <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="mb-2 text-[10px] font-semibold text-slate-700">
                        Cotizado vs. ganado
                    </p>
                    <div className="flex flex-1 items-end gap-3 border-b border-slate-200 px-1">
                        {bars.map(([a, b], i) => (
                            <div
                                key={i}
                                className="flex flex-1 items-end gap-[3px]"
                            >
                                {[
                                    [a, '#8b5cf6'],
                                    [b, '#16a34a'],
                                ].map(([h, c], j) => (
                                    <div
                                        key={j}
                                        className="w-full origin-bottom rounded-t-[3px]"
                                        style={{
                                            height: `${h}%`,
                                            background: String(c),
                                            animation: `bar-grow 0.8s ${300 + i * 110 + j * 60}ms cubic-bezier(.2,.8,.2,1) both`,
                                        }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex w-[150px] flex-col items-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="mb-2 self-start text-[10px] font-semibold text-slate-700">
                        Ganadas vs. perdidas
                    </p>
                    <div
                        className="relative size-[88px] rounded-full"
                        style={{
                            background:
                                'conic-gradient(#16a34a 0 64%, #e11d48 64% 100%)',
                            animation: 'mock-pop 0.7s 0.5s ease both',
                        }}
                    >
                        <div className="absolute inset-[16px] flex flex-col items-center justify-center rounded-full bg-white">
                            <span className="text-[13px] font-bold text-slate-800">
                                64%
                            </span>
                            <span className="text-[7px] text-slate-500">
                                cierre
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ContactsScreen() {
    const people = [
        [
            'MR',
            'María Reyes',
            'Grupo Industrial Morelos · Compras',
            'Cliente',
            '#8b5cf6',
        ],
        [
            'JC',
            'Jorge Castillo',
            'Logística Integral · Dirección',
            'Contacto',
            '#2563eb',
        ],
        [
            'AV',
            'Ana Villaseñor',
            'Constructora del Bajío · TI',
            'Cliente',
            '#d97706',
        ],
        [
            'LP',
            'Luis Paredes',
            'Servicios Alfa · Finanzas',
            'Contacto',
            '#16a34a',
        ],
        [
            'SG',
            'Sofía Garza',
            'Textiles Norte · Gerencia',
            'Cliente',
            '#c026d3',
        ],
    ];

    return (
        <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-800">
                    Clientes y contactos
                </p>
                <div className="flex w-44 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] text-slate-400">
                    <Search className="size-3" /> Buscar contacto…
                </div>
            </div>
            <div className="flex-1 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
                {people.map(([ini, n, sub, tag, color], i) => (
                    <div
                        key={n}
                        style={stage(150 + i * 130)}
                        className="animate-in fade-in slide-in-from-right-4 fill-mode-backwards flex items-center gap-2.5 px-3 py-2 duration-500"
                    >
                        <span
                            className="flex size-7 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ background: color }}
                        >
                            {ini}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-slate-800">
                                {n}
                            </p>
                            <p className="truncate text-[8.5px] text-slate-500">
                                {sub}
                            </p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[8px] font-semibold text-violet-700">
                            {tag}
                        </span>
                        <span className="rounded-md bg-violet-700 px-2 py-1 text-[8px] font-semibold text-white">
                            Cotizar
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* --------------------------------------------------------------------- */

const SLIDES: {
    key: string;
    icon: LucideIcon;
    nav: number;
    title: string;
    text: string;
    Screen: () => React.JSX.Element;
}[] = [
    {
        key: 'pipeline',
        icon: Kanban,
        nav: 1,
        title: 'Pipeline de oportunidades',
        text: 'Arrastra cada oportunidad por sus etapas hasta cerrarla como ganada.',
        Screen: PipelineScreen,
    },
    {
        key: 'quotes',
        icon: FileText,
        nav: 2,
        title: 'Cotizaciones y envío por correo',
        text: 'Arma la cotización, descarga el PDF y envíala desde tu buzón de Microsoft 365.',
        Screen: QuoteScreen,
    },
    {
        key: 'charts',
        icon: ChartNoAxesCombined,
        nav: 4,
        title: 'Gráficas y reportes',
        text: 'Mide cotizado, ventas, cierre y pronóstico, y exporta el reporte en PDF.',
        Screen: ChartsScreen,
    },
    {
        key: 'contacts',
        icon: BookUser,
        nav: 3,
        title: 'Clientes y contactos',
        text: 'Un directorio único que reutilizas al cotizar y dar seguimiento.',
        Screen: ContactsScreen,
    },
];

const NAV_ICONS: LucideIcon[] = [
    LayoutGrid,
    Kanban,
    FileText,
    Users,
    ChartNoAxesCombined,
];

/** Laptop con pantallas de la aplicación que rotan solas; se inclina suavemente con el cursor. */
export default function LaptopMockup() {
    const [index, setIndex] = useState(0);
    const [scale, setScale] = useState(0.7);
    const screen = useRef<HTMLDivElement>(null);
    const tilt = useRef<HTMLDivElement>(null);
    const slide = SLIDES[index];

    useEffect(() => {
        const id = window.setTimeout(
            () => setIndex((i) => (i + 1) % SLIDES.length),
            INTERVAL,
        );

        return () => window.clearTimeout(id);
    }, [index]);

    useEffect(() => {
        const el = screen.current;

        if (!el) {
            return;
        }

        const ro = new ResizeObserver(([e]) =>
            setScale(e.contentRect.width / STAGE_W),
        );
        ro.observe(el);

        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const el = tilt.current;

        if (!el) {
            return;
        }

        const onMove = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
            const y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
            el.style.setProperty('--ry', `${x * 14}deg`);
            el.style.setProperty('--rx', `${-y * 10}deg`);
        };

        window.addEventListener('pointermove', onMove);

        return () => window.removeEventListener('pointermove', onMove);
    }, []);

    return (
        <div className="w-full max-w-[600px]">
            <div style={{ perspective: 1400 }}>
                <div
                    ref={tilt}
                    style={{
                        transform:
                            'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
                        transition: 'transform 0.25s ease-out',
                    }}
                    className="pointer-events-none"
                >
                    {/* Tapa */}
                    <div className="rounded-t-[18px] border border-white/20 bg-gradient-to-b from-slate-700 to-slate-900 p-[10px] shadow-2xl shadow-black/50">
                        <div className="relative">
                            <span className="absolute -top-[6px] left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-slate-500" />
                            <div
                                ref={screen}
                                style={{ height: STAGE_H * scale }}
                                className="relative overflow-hidden rounded-[6px] bg-[#f6f4fb]"
                            >
                                <div
                                    style={{
                                        width: STAGE_W,
                                        height: STAGE_H,
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top left',
                                    }}
                                    className="flex"
                                >
                                    {/* Menú lateral de la app */}
                                    <div className="flex w-[52px] flex-col items-center gap-3 bg-gradient-to-b from-[#3b0764] to-[#22064a] py-3">
                                        <span className="mb-1 size-6 rounded-md bg-white/90" />
                                        {NAV_ICONS.map((Icon, i) => (
                                            <span
                                                key={i}
                                                className={cn(
                                                    'flex size-8 items-center justify-center rounded-lg text-white/70 transition-all duration-500',
                                                    i === slide.nav &&
                                                        'scale-110 bg-white/20 text-white shadow-[0_0_14px_rgba(167,139,250,0.7)]',
                                                )}
                                            >
                                                <Icon className="size-[15px]" />
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <div className="flex h-9 items-center gap-2 border-b border-slate-200 bg-white px-3">
                                            <div className="flex flex-1 items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[9px] text-slate-400">
                                                <Search className="size-3" />{' '}
                                                Buscar…
                                            </div>
                                            <span className="size-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                                        </div>
                                        <div className="flex-1 overflow-hidden p-3.5">
                                            <div
                                                key={slide.key}
                                                className="animate-in fade-in slide-in-from-bottom-2 h-full duration-500"
                                            >
                                                <slide.Screen />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Reflejo del cristal */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
                            </div>
                        </div>
                    </div>
                    {/* Base */}
                    <div className="mx-auto h-[12px] w-[108%] -translate-x-[3.7%] rounded-b-[14px] bg-gradient-to-b from-slate-300 to-slate-500 shadow-xl shadow-black/40">
                        <div className="mx-auto h-[4px] w-[18%] rounded-b-md bg-slate-600/70" />
                    </div>
                </div>
            </div>

            {/* Descripción de la pantalla actual */}
            <div className="mt-9 min-h-[78px]">
                <div
                    key={slide.key}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                    <p className="flex items-center gap-2 text-[15px] font-semibold">
                        <slide.icon className="size-4 text-violet-300" />
                        {slide.title}
                    </p>
                    <p className="mt-1 max-w-[460px] text-[13px] leading-relaxed text-[#ddd3f7]">
                        {slide.text}
                    </p>
                </div>
            </div>

            {/* Indicadores (clicables) */}
            <div className="mt-3 flex gap-2">
                {SLIDES.map((s, i) => (
                    <button
                        key={s.key}
                        type="button"
                        aria-label={s.title}
                        onClick={() => setIndex(i)}
                        className={cn(
                            'relative h-1.5 overflow-hidden rounded-full bg-white/20 transition-all duration-500',
                            i === index ? 'w-12' : 'w-6 hover:bg-white/35',
                        )}
                    >
                        {i === index && (
                            <span
                                key={index}
                                className="absolute inset-y-0 left-0 rounded-full bg-white"
                                style={{
                                    animation: `dot-fill ${INTERVAL}ms linear forwards`,
                                }}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
