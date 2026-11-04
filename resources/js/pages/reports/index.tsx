import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Download,
    FileDown,
    BadgeDollarSign,
    FileText,
    Kanban,
    Percent,
    RotateCcw,
    Target,
    Trophy,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Kpi = {
    quoted: number;
    quotes: number;
    won: number;
    won_count: number;
    lost_count: number;
    win_rate: number | null;
    avg_ticket: number | null;
    margin: number | null;
    new_opps: number;
};

type Props = {
    filters: {
        period: string;
        from: string;
        to: string;
        seller: number | null;
        client: number | null;
    };
    range: { days: number; from: string; to: string };
    kpis: {
        current: Kpi;
        previous: Kpi;
        pipeline_open: number;
        pipeline_count: number;
        pipeline_weighted: number;
    };
    series: {
        date: string;
        quoted: number;
        won: number;
        quotes: number;
        margin: number | null;
    }[];
    bucket: 'day' | 'week' | 'month';
    funnel: { stage: string; label: string; count: number; amount: number }[];
    outcome: {
        won: { count: number; amount: number };
        lost: { count: number; amount: number };
    };
    lostReasons: { reason: string; count: number }[];
    topClients: { name: string; quotes: number; amount: number }[];
    currencies: { currency: string; quotes: number; amount: number }[];
    forecast: {
        months: {
            month: string;
            amount: number;
            weighted: number;
            count: number;
        }[];
        overdue: { amount: number; count: number };
        undated: { amount: number; count: number };
    };
    topOpen: {
        id: number;
        name: string;
        client: string | null;
        stage: string;
        stage_label: string;
        amount: number;
        expected_close_date: string | null;
        owner: string | null;
    }[];
    sellers:
        | {
              id: number;
              name: string;
              quotes: number;
              quoted: number;
              won_count: number;
              won: number;
              win_rate: number | null;
          }[]
        | null;
    exportSections: { key: string; label: string }[];
    options: {
        sellers: { id: number; name: string }[];
        clients: { id: number; name: string }[];
    };
};

const PERIODS = [
    { key: '7d', label: '7 días' },
    { key: '30d', label: '30 días' },
    { key: '90d', label: '90 días' },
    { key: 'month', label: 'Este mes' },
    { key: 'year', label: 'Este año' },
    { key: '12m', label: '12 meses' },
    { key: 'custom', label: 'Personalizado' },
];

// Colores del pipeline (mismos tonos que el tablero de oportunidades).
const STAGE_COLOR: Record<string, string> = {
    oportunidad: '#94a3b8',
    calificado: '#60a5fa',
    dimensionamiento: '#a78bfa',
    presentado: '#f59e0b',
    ganado: '#16a34a',
    perdido: '#e11d48',
};

const CHART = [
    'var(--chart-1)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--chart-2)',
];

const card = 'bg-card rounded-xl border shadow-sm';
const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' };

const money = (n: number) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
    }).format(n);

const compact = (n: number) =>
    new Intl.NumberFormat('es-MX', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(n);

const parse = (iso: string) => new Date(`${iso}T00:00:00`);

function bucketLabel(iso: string, bucket: Props['bucket']) {
    const d = parse(iso);

    return bucket === 'month'
        ? new Intl.DateTimeFormat('es-MX', {
              month: 'short',
              year: '2-digit',
          }).format(d)
        : new Intl.DateTimeFormat('es-MX', {
              day: 'numeric',
              month: 'short',
          }).format(d);
}

/** Variación porcentual frente al periodo anterior (null si no es comparable). */
function delta(cur: number | null, prev: number | null) {
    if (cur === null || prev === null || prev === 0) {
        return null;
    }

    return ((cur - prev) / Math.abs(prev)) * 100;
}

function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
    if (value === null) {
        return (
            <span className="text-muted-foreground text-xs">
                sin comparativo
            </span>
        );
    }

    const good = invert ? value <= 0 : value >= 0;
    const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                good
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
            )}
        >
            <Icon className="size-3" />
            {Math.abs(value).toFixed(1)}%
        </span>
    );
}

function Tip({
    active,
    payload,
    label,
    format,
}: {
    active?: boolean;
    payload?: {
        name: string;
        value: number;
        color?: string;
        payload?: Record<string, unknown>;
    }[];
    label?: string;
    format?: (name: string, value: number) => string;
}) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="bg-popover/95 text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-xl backdrop-blur">
            {label && <p className="mb-1 font-semibold">{label}</p>}
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span
                        className="size-2 rounded-full"
                        style={{ background: p.color }}
                    />
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="ml-auto pl-3 font-semibold tabular-nums">
                        {format
                            ? format(p.name, p.value)
                            : money(p.value as number)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function KpiCard({
    icon: Icon,
    label,
    value,
    sub,
    delta: d,
    invert,
    tone = 'violet',
    spark,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    sub?: string;
    delta?: number | null;
    invert?: boolean;
    tone?: 'violet' | 'green' | 'blue' | 'amber' | 'rose';
    spark?: { v: number }[];
}) {
    const tones = {
        violet: [
            'bg-violet-500/15 text-violet-600 dark:text-violet-300',
            '#8b5cf6',
        ],
        green: [
            'bg-green-500/15 text-green-600 dark:text-green-400',
            '#16a34a',
        ],
        blue: ['bg-blue-500/15 text-blue-600 dark:text-blue-400', '#2563eb'],
        amber: [
            'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            '#d97706',
        ],
        rose: ['bg-rose-500/15 text-rose-600 dark:text-rose-400', '#e11d48'],
    }[tone];
    const id = `spark-${label.replace(/\W/g, '')}`;

    return (
        <div
            className={cn(
                card,
                'group animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden p-4 transition duration-500 hover:-translate-y-0.5 hover:shadow-md',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs font-medium">
                        {label}
                    </p>
                    <p className="mt-1 truncate text-2xl font-bold tracking-tight tabular-nums">
                        {value}
                    </p>
                </div>
                <span
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        tones[0],
                    )}
                >
                    <Icon className="size-4.5" />
                </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
                {d !== undefined && <Delta value={d} invert={invert} />}
                {sub && (
                    <span className="text-muted-foreground truncate text-xs">
                        {sub}
                    </span>
                )}
            </div>
            {spark && spark.length > 1 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={spark}>
                            <defs>
                                <linearGradient
                                    id={id}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor={tones[1]}
                                        stopOpacity={0.35}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor={tones[1]}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="v"
                                stroke={tones[1]}
                                strokeWidth={1.5}
                                fill={`url(#${id})`}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function Panel({
    title,
    subtitle,
    children,
    className,
    right,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    right?: React.ReactNode;
}) {
    return (
        <section
            className={cn(
                card,
                'animate-in fade-in slide-in-from-bottom-2 p-4 duration-500',
                className,
            )}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {subtitle && (
                        <p className="text-muted-foreground text-xs">
                            {subtitle}
                        </p>
                    )}
                </div>
                {right}
            </div>
            {children}
        </section>
    );
}

function Empty({ text = 'Sin datos en este periodo' }: { text?: string }) {
    return (
        <div className="text-muted-foreground flex h-full min-h-32 items-center justify-center text-sm">
            {text}
        </div>
    );
}

export default function Reports(props: Props) {
    const {
        filters,
        range,
        kpis,
        series,
        bucket,
        funnel,
        outcome,
        lostReasons,
        topClients,
        currencies,
        forecast,
        topOpen,
        sellers,
        options,
        exportSections,
    } = props;
    const { current: c, previous: p } = kpis;
    const [loading, setLoading] = useState(false);
    const [custom, setCustom] = useState({
        from: filters.from,
        to: filters.to,
    });

    useEffect(() => {
        setCustom({ from: filters.from, to: filters.to });
    }, [filters.from, filters.to]);

    const [exportOpen, setExportOpen] = useState(false);
    const [exportTitle, setExportTitle] = useState('Reporte de ventas');
    const [chosen, setChosen] = useState<string[]>(
        exportSections.map((s) => s.key),
    );

    const toggleSection = (key: string, on: boolean) =>
        setChosen((prev) =>
            on ? [...prev, key] : prev.filter((k) => k !== key),
        );

    /** Descarga el PDF con los filtros activos y las secciones elegidas. */
    const exportPdf = () => {
        const q = new URLSearchParams({ period: filters.period });

        if (filters.period === 'custom') {
            q.set('from', filters.from);
            q.set('to', filters.to);
        }

        if (filters.seller) {
            q.set('seller', String(filters.seller));
        }

        if (filters.client) {
            q.set('client', String(filters.client));
        }

        q.set('title', exportTitle.trim() || 'Reporte de ventas');
        exportSections
            .filter((s) => chosen.includes(s.key))
            .forEach((s) => q.append('sections[]', s.key));

        window.location.href = `/graficas/exportar?${q.toString()}`;
        setExportOpen(false);
    };

    const apply = (next: Partial<typeof filters>) => {
        const merged = { ...filters, ...next };
        const params: Record<string, string | number> = {
            period: merged.period,
        };

        if (merged.period === 'custom') {
            params.from = merged.from;
            params.to = merged.to;
        }

        if (merged.seller) {
            params.seller = merged.seller;
        }

        if (merged.client) {
            params.client = merged.client;
        }

        router.get('/graficas', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    const hasFilters = !!(filters.seller || filters.client);
    const data = series.map((s) => ({
        ...s,
        label: bucketLabel(s.date, bucket),
    }));
    const outcomeData = [
        {
            name: 'Ganadas',
            value: outcome.won.count,
            color: STAGE_COLOR.ganado,
        },
        {
            name: 'Perdidas',
            value: outcome.lost.count,
            color: STAGE_COLOR.perdido,
        },
    ];
    const outcomeTotal = outcome.won.count + outcome.lost.count;
    const fMonths = forecast.months.map((m) => ({
        ...m,
        label: new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(
            parse(m.month),
        ),
    }));
    const maxClient = Math.max(1, ...topClients.map((t) => t.amount));
    const funnelMax = Math.max(1, ...funnel.map((f) => f.count));
    const rangeText = `${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(parse(range.from))} – ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(parse(range.to))}`;

    return (
        <>
            <Head title="Gráficas" />

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Exportar reporte en PDF</DialogTitle>
                        <DialogDescription>
                            Incluye portada con la marca del sistema. Usa los
                            filtros activos de la página; cámbialos antes de
                            exportar si necesitas otro corte.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="bg-muted/60 flex flex-wrap gap-1.5 rounded-lg p-3 text-xs">
                            <span className="bg-background rounded-full border px-2 py-0.5">
                                {PERIODS.find((p) => p.key === filters.period)
                                    ?.label ?? filters.period}
                                : {filters.from} → {filters.to}
                            </span>
                            <span className="bg-background rounded-full border px-2 py-0.5">
                                {filters.seller
                                    ? (options.sellers.find(
                                          (s) => s.id === filters.seller,
                                      )?.name ?? 'Vendedor')
                                    : options.sellers.length
                                      ? 'Todos los vendedores'
                                      : 'Mis datos'}
                            </span>
                            <span className="bg-background rounded-full border px-2 py-0.5">
                                {filters.client
                                    ? (options.clients.find(
                                          (c) => c.id === filters.client,
                                      )?.name ?? 'Cliente')
                                    : 'Todos los clientes'}
                            </span>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="report-title">
                                Título del reporte
                            </Label>
                            <Input
                                id="report-title"
                                value={exportTitle}
                                maxLength={80}
                                onChange={(e) => setExportTitle(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>Secciones a incluir</Label>
                                <button
                                    type="button"
                                    className="text-primary text-xs hover:underline"
                                    onClick={() =>
                                        setChosen(
                                            chosen.length ===
                                                exportSections.length
                                                ? []
                                                : exportSections.map(
                                                      (s) => s.key,
                                                  ),
                                        )
                                    }
                                >
                                    {chosen.length === exportSections.length
                                        ? 'Quitar todas'
                                        : 'Seleccionar todas'}
                                </button>
                            </div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {exportSections.map((s) => (
                                    <label
                                        key={s.key}
                                        className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={chosen.includes(s.key)}
                                            onCheckedChange={(v) =>
                                                toggleSection(s.key, v === true)
                                            }
                                        />
                                        {s.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setExportOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            data-sound="success"
                            disabled={chosen.length === 0}
                            onClick={exportPdf}
                        >
                            <Download /> Descargar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col gap-5 p-4 md:p-6">
                {/* Encabezado + filtros */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Gráficas
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {rangeText} · {range.days} días · importes en
                                MXN
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                    'text-muted-foreground flex items-center gap-2 text-xs transition-opacity',
                                    loading ? 'opacity-100' : 'opacity-0',
                                )}
                            >
                                <span className="border-primary size-3 animate-spin rounded-full border-2 border-t-transparent" />
                                Actualizando…
                            </div>
                            <Button
                                data-sound="open"
                                onClick={() => setExportOpen(true)}
                            >
                                <FileDown /> Exportar PDF
                            </Button>
                        </div>
                    </div>

                    <div
                        className={cn(
                            card,
                            'flex flex-wrap items-center gap-3 p-3',
                        )}
                    >
                        <div className="bg-muted flex flex-wrap gap-1 rounded-lg p-1">
                            {PERIODS.map((pr) => (
                                <button
                                    key={pr.key}
                                    type="button"
                                    onClick={() => apply({ period: pr.key })}
                                    className={cn(
                                        'rounded-md px-3 py-1.5 text-xs font-medium transition',
                                        filters.period === pr.key
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {pr.label}
                                </button>
                            ))}
                        </div>

                        {filters.period === 'custom' && (
                            <div className="animate-in fade-in slide-in-from-left-2 flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={custom.from}
                                    max={custom.to}
                                    onChange={(e) =>
                                        setCustom({
                                            ...custom,
                                            from: e.target.value,
                                        })
                                    }
                                    className="h-9 w-40"
                                />
                                <span className="text-muted-foreground text-xs">
                                    a
                                </span>
                                <Input
                                    type="date"
                                    value={custom.to}
                                    min={custom.from}
                                    onChange={(e) =>
                                        setCustom({
                                            ...custom,
                                            to: e.target.value,
                                        })
                                    }
                                    className="h-9 w-40"
                                />
                                <Button
                                    size="sm"
                                    disabled={!custom.from || !custom.to}
                                    onClick={() =>
                                        apply({
                                            period: 'custom',
                                            from: custom.from,
                                            to: custom.to,
                                        })
                                    }
                                >
                                    Aplicar
                                </Button>
                            </div>
                        )}

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            {options.sellers.length > 0 && (
                                <Select
                                    value={
                                        filters.seller
                                            ? String(filters.seller)
                                            : 'all'
                                    }
                                    onValueChange={(v) =>
                                        apply({
                                            seller:
                                                v === 'all' ? null : Number(v),
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-9 w-44">
                                        <SelectValue placeholder="Vendedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todos los vendedores
                                        </SelectItem>
                                        {options.sellers.map((s) => (
                                            <SelectItem
                                                key={s.id}
                                                value={String(s.id)}
                                            >
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Select
                                value={
                                    filters.client
                                        ? String(filters.client)
                                        : 'all'
                                }
                                onValueChange={(v) =>
                                    apply({
                                        client: v === 'all' ? null : Number(v),
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-48">
                                    <SelectValue placeholder="Cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos los clientes
                                    </SelectItem>
                                    {options.clients.map((cl) => (
                                        <SelectItem
                                            key={cl.id}
                                            value={String(cl.id)}
                                        >
                                            {cl.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {hasFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        apply({ seller: null, client: null })
                                    }
                                >
                                    <RotateCcw /> Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        'flex flex-col gap-5 transition-opacity duration-200',
                        loading && 'pointer-events-none opacity-60',
                    )}
                >
                    {/* Tarjetas */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={FileText}
                            label="Total cotizado"
                            value={money(c.quoted)}
                            sub={`${c.quotes} cotizaciones`}
                            delta={delta(c.quoted, p.quoted)}
                            spark={data.map((d) => ({ v: d.quoted }))}
                        />
                        <KpiCard
                            icon={Trophy}
                            tone="green"
                            label="Ventas ganadas"
                            value={money(c.won)}
                            sub={`${c.won_count} oportunidades`}
                            delta={delta(c.won, p.won)}
                            spark={data.map((d) => ({ v: d.won }))}
                        />
                        <KpiCard
                            icon={Target}
                            tone="blue"
                            label="Tasa de cierre"
                            value={c.win_rate === null ? '—' : `${c.win_rate}%`}
                            sub={`${c.won_count} ganadas · ${c.lost_count} perdidas`}
                            delta={delta(c.win_rate, p.win_rate)}
                        />
                        <KpiCard
                            icon={Percent}
                            tone="amber"
                            label="Margen promedio"
                            value={c.margin === null ? '—' : `${c.margin}%`}
                            sub="sobre lo cotizado"
                            delta={delta(c.margin, p.margin)}
                            spark={data.map((d) => ({ v: d.margin ?? 0 }))}
                        />
                        <KpiCard
                            icon={Kanban}
                            label="Pipeline abierto"
                            value={money(kpis.pipeline_open)}
                            sub={`${kpis.pipeline_count} oportunidades`}
                        />
                        <KpiCard
                            icon={Wallet}
                            tone="blue"
                            label="Pronóstico ponderado"
                            value={money(kpis.pipeline_weighted)}
                            sub="según probabilidad por etapa"
                        />
                        <KpiCard
                            icon={BadgeDollarSign}
                            tone="green"
                            label="Ticket promedio"
                            value={
                                c.avg_ticket === null
                                    ? '—'
                                    : money(c.avg_ticket)
                            }
                            sub="por venta ganada"
                            delta={delta(c.avg_ticket, p.avg_ticket)}
                        />
                        <KpiCard
                            icon={Target}
                            tone="rose"
                            label="Nuevas oportunidades"
                            value={String(c.new_opps)}
                            sub="creadas en el periodo"
                            delta={delta(c.new_opps, p.new_opps)}
                        />
                    </div>

                    {/* Cotizado vs ganado + embudo */}
                    <div className="grid gap-5 xl:grid-cols-3">
                        <Panel
                            title="Cotizado vs. ganado"
                            subtitle={`Por ${bucket === 'day' ? 'día' : bucket === 'week' ? 'semana' : 'mes'}`}
                            className="xl:col-span-2"
                        >
                            <div className="h-72">
                                {data.some((d) => d.quoted || d.won) ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <AreaChart
                                            data={data}
                                            margin={{ left: -10, right: 8 }}
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="gq"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="0%"
                                                        stopColor="#8b5cf6"
                                                        stopOpacity={0.45}
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor="#8b5cf6"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                                <linearGradient
                                                    id="gw"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="0%"
                                                        stopColor="#16a34a"
                                                        stopOpacity={0.45}
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor="#16a34a"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="var(--border)"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={AXIS}
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={24}
                                            />
                                            <YAxis
                                                tick={AXIS}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={compact}
                                            />
                                            <Tooltip content={<Tip />} />
                                            <Legend
                                                iconType="circle"
                                                wrapperStyle={{ fontSize: 12 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="quoted"
                                                name="Cotizado"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                fill="url(#gq)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="won"
                                                name="Ganado"
                                                stroke="#16a34a"
                                                strokeWidth={2}
                                                fill="url(#gw)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <Empty />
                                )}
                            </div>
                        </Panel>

                        <Panel
                            title="Embudo de oportunidades"
                            subtitle="Creadas en el periodo, por etapa actual"
                        >
                            <div className="flex flex-col gap-2.5">
                                {funnel.map((f) => (
                                    <div key={f.stage}>
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 font-medium">
                                                <span
                                                    className="size-2 rounded-full"
                                                    style={{
                                                        background:
                                                            STAGE_COLOR[
                                                                f.stage
                                                            ],
                                                    }}
                                                />
                                                {f.label}
                                            </span>
                                            <span className="text-muted-foreground tabular-nums">
                                                {f.count} · {compact(f.amount)}
                                            </span>
                                        </div>
                                        <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${(f.count / funnelMax) * 100}%`,
                                                    background:
                                                        STAGE_COLOR[f.stage],
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    {/* Ganadas vs perdidas, margen, moneda */}
                    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                        <Panel
                            title="Ganadas vs. perdidas"
                            subtitle="Oportunidades cerradas en el periodo"
                        >
                            {outcomeTotal === 0 ? (
                                <Empty />
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="relative h-44 w-44 shrink-0">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={outcomeData}
                                                    dataKey="value"
                                                    innerRadius="68%"
                                                    outerRadius="100%"
                                                    paddingAngle={3}
                                                    cornerRadius={6}
                                                    stroke="none"
                                                >
                                                    {outcomeData.map((d) => (
                                                        <Cell
                                                            key={d.name}
                                                            fill={d.color}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={
                                                        <Tip
                                                            format={(_, v) =>
                                                                `${v}`
                                                            }
                                                        />
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold">
                                                {c.win_rate ?? 0}%
                                            </span>
                                            <span className="text-muted-foreground text-[11px]">
                                                cierre
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col gap-3 text-sm">
                                        <div>
                                            <p className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400">
                                                <Trophy className="size-3.5" />
                                                {outcome.won.count} ganadas
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {money(outcome.won.amount)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-rose-600 dark:text-rose-400">
                                                {outcome.lost.count} perdidas
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {money(outcome.lost.amount)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {lostReasons.length > 0 && (
                                <div className="mt-4 border-t pt-3">
                                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                                        Motivos de pérdida
                                    </p>
                                    <ul className="flex flex-col gap-1.5 text-xs">
                                        {lostReasons.map((r) => (
                                            <li
                                                key={r.reason}
                                                className="flex items-center justify-between gap-2"
                                            >
                                                <span className="truncate">
                                                    {r.reason}
                                                </span>
                                                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-600 dark:text-rose-400">
                                                    {r.count}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Panel>

                        <Panel
                            title="Margen y volumen de cotizaciones"
                            subtitle="Cotizaciones emitidas y margen %"
                        >
                            <div className="h-64">
                                {data.some((d) => d.quotes) ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <ComposedChart
                                            data={data}
                                            margin={{ left: -18, right: -10 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="var(--border)"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={AXIS}
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={24}
                                            />
                                            <YAxis
                                                yAxisId="l"
                                                tick={AXIS}
                                                tickLine={false}
                                                axisLine={false}
                                                allowDecimals={false}
                                            />
                                            <YAxis
                                                yAxisId="r"
                                                orientation="right"
                                                tick={AXIS}
                                                tickLine={false}
                                                axisLine={false}
                                                unit="%"
                                            />
                                            <Tooltip
                                                content={
                                                    <Tip
                                                        format={(n, v) =>
                                                            n === 'Margen'
                                                                ? `${v}%`
                                                                : `${v}`
                                                        }
                                                    />
                                                }
                                            />
                                            <Bar
                                                yAxisId="l"
                                                dataKey="quotes"
                                                name="Cotizaciones"
                                                fill="#a78bfa"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={28}
                                            />
                                            <Line
                                                yAxisId="r"
                                                type="monotone"
                                                dataKey="margin"
                                                name="Margen"
                                                stroke="#d97706"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                connectNulls
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <Empty />
                                )}
                            </div>
                        </Panel>

                        <Panel
                            title="Cotizado por moneda"
                            subtitle="Equivalente en MXN"
                        >
                            {currencies.length === 0 ? (
                                <Empty />
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="h-44 w-44 shrink-0">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={currencies}
                                                    dataKey="amount"
                                                    nameKey="currency"
                                                    innerRadius="55%"
                                                    outerRadius="100%"
                                                    paddingAngle={3}
                                                    cornerRadius={6}
                                                    stroke="none"
                                                >
                                                    {currencies.map((cu, i) => (
                                                        <Cell
                                                            key={cu.currency}
                                                            fill={
                                                                CHART[
                                                                    i %
                                                                        CHART.length
                                                                ]
                                                            }
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<Tip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <ul className="flex flex-1 flex-col gap-2 text-sm">
                                        {currencies.map((cu, i) => (
                                            <li
                                                key={cu.currency}
                                                className="flex items-center gap-2"
                                            >
                                                <span
                                                    className="size-2.5 rounded-full"
                                                    style={{
                                                        background:
                                                            CHART[
                                                                i % CHART.length
                                                            ],
                                                    }}
                                                />
                                                <span className="font-medium">
                                                    {cu.currency}
                                                </span>
                                                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                                                    {compact(cu.amount)} ·{' '}
                                                    {cu.quotes}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Panel>
                    </div>

                    {/* Clientes + pronóstico */}
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Panel
                            title="Principales clientes"
                            subtitle="Por monto cotizado en el periodo"
                        >
                            {topClients.length === 0 ? (
                                <Empty />
                            ) : (
                                <ul className="flex flex-col gap-3">
                                    {topClients.map((t, i) => (
                                        <li key={t.name}>
                                            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                                <span className="flex min-w-0 items-center gap-2 font-medium">
                                                    <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]">
                                                        {i + 1}
                                                    </span>
                                                    <span className="truncate">
                                                        {t.name}
                                                    </span>
                                                </span>
                                                <span className="text-muted-foreground shrink-0 tabular-nums">
                                                    {money(t.amount)} ·{' '}
                                                    {t.quotes}
                                                </span>
                                            </div>
                                            <div className="bg-muted h-2 overflow-hidden rounded-full">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${(t.amount / maxClient) * 100}%`,
                                                        background:
                                                            'linear-gradient(90deg, #6d28d9, #a78bfa)',
                                                    }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel
                            title="Pronóstico de cierre"
                            subtitle="Pipeline abierto por mes esperado de cierre"
                            right={
                                (forecast.overdue.count > 0 ||
                                    forecast.undated.count > 0) && (
                                    <div className="flex flex-col items-end gap-1 text-[11px]">
                                        {forecast.overdue.count > 0 && (
                                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-medium text-rose-600 dark:text-rose-400">
                                                {forecast.overdue.count}{' '}
                                                vencidas ·{' '}
                                                {compact(
                                                    forecast.overdue.amount,
                                                )}
                                            </span>
                                        )}
                                        {forecast.undated.count > 0 && (
                                            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">
                                                {forecast.undated.count} sin
                                                fecha ·{' '}
                                                {compact(
                                                    forecast.undated.amount,
                                                )}
                                            </span>
                                        )}
                                    </div>
                                )
                            }
                        >
                            <div className="h-56">
                                {fMonths.some((m) => m.amount) ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={fMonths}
                                            margin={{ left: -10, right: 8 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="var(--border)"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={AXIS}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                tick={AXIS}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={compact}
                                            />
                                            <Tooltip content={<Tip />} />
                                            <Legend
                                                iconType="circle"
                                                wrapperStyle={{ fontSize: 12 }}
                                            />
                                            <Bar
                                                dataKey="amount"
                                                name="Pipeline"
                                                fill="#c4b5fd"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={32}
                                            />
                                            <Bar
                                                dataKey="weighted"
                                                name="Ponderado"
                                                fill="#6d28d9"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={32}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <Empty text="Sin oportunidades abiertas con fecha de cierre" />
                                )}
                            </div>
                        </Panel>
                    </div>

                    {/* Tablas */}
                    <div
                        className={cn(
                            'grid gap-5',
                            sellers && 'xl:grid-cols-2',
                        )}
                    >
                        <Panel
                            title="Oportunidades abiertas de mayor valor"
                            subtitle="Las más grandes del pipeline actual"
                        >
                            {topOpen.length === 0 ? (
                                <Empty text="Sin oportunidades abiertas" />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-muted-foreground text-left text-xs">
                                            <tr>
                                                <th className="pb-2 font-medium">
                                                    Oportunidad
                                                </th>
                                                <th className="pb-2 font-medium">
                                                    Etapa
                                                </th>
                                                <th className="pb-2 text-right font-medium">
                                                    Monto
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {topOpen.map((o) => (
                                                <tr
                                                    key={o.id}
                                                    className="hover:bg-muted/50 transition"
                                                >
                                                    <td className="py-2 pr-2">
                                                        <Link
                                                            href={`/oportunidades/${o.id}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {o.name}
                                                        </Link>
                                                        <p className="text-muted-foreground text-xs">
                                                            {o.client ??
                                                                'Sin cliente'}
                                                            {o.owner
                                                                ? ` · ${o.owner}`
                                                                : ''}
                                                        </p>
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <span
                                                            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                                            style={{
                                                                background:
                                                                    STAGE_COLOR[
                                                                        o.stage
                                                                    ],
                                                            }}
                                                        >
                                                            {o.stage_label}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-right font-semibold tabular-nums">
                                                        {money(o.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>

                        {sellers && (
                            <Panel
                                title="Desempeño por vendedor"
                                subtitle="Cotizado, ganado y tasa de cierre"
                            >
                                {sellers.length === 0 ? (
                                    <Empty />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="text-muted-foreground text-left text-xs">
                                                <tr>
                                                    <th className="pb-2 font-medium">
                                                        Vendedor
                                                    </th>
                                                    <th className="pb-2 text-right font-medium">
                                                        Cotizado
                                                    </th>
                                                    <th className="pb-2 text-right font-medium">
                                                        Ganado
                                                    </th>
                                                    <th className="pb-2 text-right font-medium">
                                                        Cierre
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {sellers.map((s, i) => (
                                                    <tr
                                                        key={s.id}
                                                        className="hover:bg-muted/50 transition"
                                                    >
                                                        <td className="py-2 pr-2">
                                                            <span className="flex items-center gap-2 font-medium">
                                                                <span className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded-full text-[10px]">
                                                                    {i + 1}
                                                                </span>
                                                                {s.name}
                                                            </span>
                                                            <p className="text-muted-foreground pl-7 text-xs">
                                                                {s.quotes}{' '}
                                                                cotizaciones ·{' '}
                                                                {s.won_count}{' '}
                                                                ganadas
                                                            </p>
                                                        </td>
                                                        <td className="py-2 text-right tabular-nums">
                                                            {money(s.quoted)}
                                                        </td>
                                                        <td className="py-2 text-right font-semibold text-green-600 tabular-nums dark:text-green-400">
                                                            {money(s.won)}
                                                        </td>
                                                        <td className="py-2 text-right tabular-nums">
                                                            {s.win_rate === null
                                                                ? '—'
                                                                : `${s.win_rate}%`}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Panel>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
