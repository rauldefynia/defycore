import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CircleDollarSign,
    FileText,
    GripVertical,
    Kanban,
    Percent,
    Plus,
    Search,
    Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { LostReasonDialog } from '@/components/opportunity-lost-dialog';
import { Button } from '@/components/ui/button';
import { useWinCelebration } from '@/components/win-celebration';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STAGE_STYLES } from '@/lib/opportunity';
import type { OpportunityCard, Stage, StageKey } from '@/lib/opportunity';
import { formatMoney } from '@/lib/quote-calc';

type Pending = { id: number; before: number | null };

const fmtDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
    });

const initials = (name: string | null) =>
    (name ?? '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

/** Anima un número hacia su nuevo valor (ease-out). */
function useCountUp(target: number, ms = 600): number {
    const [value, setValue] = useState(target);
    const current = useRef(target);

    useEffect(() => {
        const from = current.current;
        const start = performance.now();
        let raf = 0;

        const tick = (now: number) => {
            const p = Math.min((now - start) / ms, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            current.current = from + (target - from) * eased;
            setValue(current.current);

            if (p < 1) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [target, ms]);

    return value;
}

function Kpi({
    icon: Icon,
    label,
    value,
    format,
    hint,
    tone,
    delay,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    format: (v: number) => string;
    hint?: string;
    tone: string;
    delay: number;
}) {
    const shown = useCountUp(value);

    return (
        <div
            className="bg-card animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex items-center gap-3.5 rounded-2xl border p-4 shadow-sm duration-500"
            style={{ animationDelay: `${delay}ms` }}
        >
            <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
            >
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                <div className="text-muted-foreground text-xs font-medium">
                    {label}
                </div>
                <div className="truncate text-xl leading-tight font-semibold tracking-tight tabular-nums">
                    {format(shown)}
                </div>
                {hint && (
                    <div className="text-muted-foreground text-[11.5px]">
                        {hint}
                    </div>
                )}
            </div>
        </div>
    );
}

function Ghost() {
    return (
        <div className="border-primary/40 bg-primary/5 animate-in fade-in zoom-in-95 text-primary/70 flex h-16 items-center justify-center rounded-xl border-2 border-dashed text-xs font-medium duration-200">
            Soltar aquí
        </div>
    );
}

export default function OpportunitiesIndex({
    opportunities,
    stages,
    clients,
    isAdmin,
}: {
    isAdmin: boolean;
    opportunities: OpportunityCard[];
    stages: Stage[];
    clients: { id: number; name: string }[];
}) {
    const [items, setItems] = useState(opportunities);
    const [dragId, setDragId] = useState<number | null>(null);
    const [overStage, setOverStage] = useState<StageKey | null>(null);
    const [overCard, setOverCard] = useState<number | null>(null);
    const [justDropped, setJustDropped] = useState<number | null>(null);
    const [pendingLost, setPendingLost] = useState<Pending | null>(null);
    const [creating, setCreating] = useState(false);
    const [query, setQuery] = useState('');
    const { celebrate, node: celebration } = useWinCelebration();

    // Sincroniza con el servidor tras cada respuesta.
    useEffect(() => setItems(opportunities), [opportunities]);

    const byStage = useMemo(() => {
        const q = query.trim().toLowerCase();
        const map = {} as Record<StageKey, OpportunityCard[]>;
        stages.forEach((s) => (map[s.key] = []));
        [...items]
            .filter(
                (o) =>
                    !q ||
                    o.name.toLowerCase().includes(q) ||
                    (o.client ?? '').toLowerCase().includes(q),
            )
            .sort((a, b) => a.position - b.position || a.id - b.id)
            .forEach((o) => map[o.stage]?.push(o));

        return map;
    }, [items, stages, query]);

    const kpis = useMemo(() => {
        const sum = (keys: StageKey[]) =>
            items
                .filter((o) => keys.includes(o.stage))
                .reduce((s, o) => s + o.value.amount_mxn, 0);
        const count = (keys: StageKey[]) =>
            items.filter((o) => keys.includes(o.stage)).length;
        const open: StageKey[] = [
            'oportunidad',
            'calificado',
            'dimensionamiento',
            'presentado',
        ];
        const won = count(['ganado']);
        const lost = count(['perdido']);

        return {
            pipeline: sum(open),
            openCount: count(open),
            wonValue: sum(['ganado']),
            wonCount: won,
            rate: won + lost > 0 ? (won / (won + lost)) * 100 : 0,
            closed: won + lost,
        };
    }, [items]);

    /** Aplica el movimiento en pantalla de inmediato y lo confirma en el servidor. */
    const moveTo = (
        id: number,
        stage: StageKey,
        before: number | null,
        lostReason?: string,
    ) => {
        const won = items.find((o) => o.id === id);

        if (stage === 'ganado' && won && won.stage !== 'ganado') {
            celebrate(
                won.name,
                `${formatMoney(won.value.amount, won.value.currency)} ${won.value.currency}`,
            );
        }

        setItems((prev) => {
            const moving = prev.find((o) => o.id === id);

            if (!moving) return prev;

            const rest = prev.filter((o) => o.id !== id);
            const column = rest
                .filter((o) => o.stage === stage)
                .sort((a, b) => a.position - b.position);
            const at = before ? column.findIndex((o) => o.id === before) : -1;
            const ordered = [...column];
            ordered.splice(at === -1 ? ordered.length : at, 0, {
                ...moving,
                stage,
            });
            const renumbered = ordered.map((o, i) => ({
                ...o,
                position: i + 1,
            }));

            return [...rest.filter((o) => o.stage !== stage), ...renumbered];
        });

        setJustDropped(id);
        window.setTimeout(() => setJustDropped(null), 900);

        router.patch(
            `/oportunidades/${id}/mover`,
            { stage, before_id: before, lost_reason: lostReason },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['opportunities'],
            },
        );
    };

    const requestMove = (
        id: number,
        stage: StageKey,
        before: number | null,
    ) => {
        const current = items.find((o) => o.id === id);

        if (
            !current ||
            (current.stage === stage && before === null && !dragId)
        ) {
            return;
        }

        if (stage === 'perdido' && current.stage !== 'perdido') {
            setPendingLost({ id, before });

            return;
        }

        moveTo(id, stage, before);
    };

    const endDrag = () => {
        setDragId(null);
        setOverStage(null);
        setOverCard(null);
    };

    const onDrop = (stage: StageKey) => {
        // Soltar sobre la propia tarjeta no cambia nada.
        if (dragId !== null && overCard !== dragId) {
            requestMove(dragId, stage, overCard);
        }

        endDrag();
    };

    const lostTarget = pendingLost
        ? items.find((o) => o.id === pendingLost.id)
        : null;
    const today = new Date().toISOString().slice(0, 10);
    const mxn = (v: number) => formatMoney(v, 'MXN');

    return (
        <>
            <Head title="Oportunidades" />
            <div className="flex flex-col gap-6 px-6 pt-4 pb-11">
                <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-wrap items-end justify-between gap-3 duration-500">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            Oportunidades
                        </h1>
                        <p className="text-muted-foreground text-[14.5px]">
                            Arrastra cada tarjeta a la etapa en la que se
                            encuentre.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar oportunidad o cliente"
                                className="bg-card w-64 pl-9"
                            />
                        </div>
                        <Button
                            onClick={() => setCreating(true)}
                            className="shadow-sm"
                        >
                            <Plus /> Nueva oportunidad
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                    <Kpi
                        icon={CircleDollarSign}
                        label="Valor en pipeline"
                        value={kpis.pipeline}
                        format={mxn}
                        hint="Etapas abiertas · MXN"
                        tone="bg-accent text-primary"
                        delay={0}
                    />
                    <Kpi
                        icon={Kanban}
                        label="Oportunidades abiertas"
                        value={kpis.openCount}
                        format={(v) => String(Math.round(v))}
                        tone="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                        delay={70}
                    />
                    <Kpi
                        icon={Trophy}
                        label="Ganado"
                        value={kpis.wonValue}
                        format={mxn}
                        hint={`${kpis.wonCount} oportunidades`}
                        tone="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
                        delay={140}
                    />
                    <Kpi
                        icon={Percent}
                        label="Tasa de cierre"
                        value={kpis.rate}
                        format={(v) => `${v.toFixed(0)}%`}
                        hint={
                            kpis.closed
                                ? `${kpis.closed} cerradas`
                                : 'Sin cierres aún'
                        }
                        tone="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                        delay={210}
                    />
                </div>

                <div className="-mx-6 flex gap-3.5 overflow-x-auto px-6 pb-3">
                    {stages.map((stage, col) => {
                        const list = byStage[stage.key] ?? [];
                        const total = list.reduce(
                            (sum, o) => sum + o.value.amount_mxn,
                            0,
                        );
                        const style = STAGE_STYLES[stage.key];
                        const isOver =
                            overStage === stage.key && dragId !== null;
                        const closedStage =
                            stage.key === 'ganado' || stage.key === 'perdido';

                        return (
                            <section
                                key={stage.key}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setOverStage(stage.key);
                                    // Los cards detienen la propagación: aquí es zona vacía (al final).
                                    setOverCard(null);
                                }}
                                onDragLeave={(e) => {
                                    if (
                                        !e.currentTarget.contains(
                                            e.relatedTarget as Node,
                                        )
                                    ) {
                                        setOverStage(null);
                                        setOverCard(null);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    onDrop(stage.key);
                                }}
                                style={{ animationDelay: `${col * 70}ms` }}
                                className={`animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards flex max-h-[calc(100vh-330px)] min-h-80 w-[290px] shrink-0 flex-col rounded-2xl border p-2 transition-[background-color,box-shadow] duration-500 ${isOver ? `${style.tint} ring-2 ${style.ring}` : 'bg-secondary/50'}`}
                            >
                                <header className="px-2 pt-1.5 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`size-2.5 rounded-full ${style.dot}`}
                                        />
                                        <h2 className="flex-1 text-[13.5px] font-semibold">
                                            {stage.label}
                                        </h2>
                                        <span
                                            className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums transition-all ${style.chip}`}
                                        >
                                            {list.length}
                                        </span>
                                        {stage.key === 'oportunidad' && (
                                            <button
                                                type="button"
                                                title="Nueva oportunidad"
                                                onClick={() =>
                                                    setCreating(true)
                                                }
                                                className="text-muted-foreground hover:bg-card hover:text-primary rounded-md p-1 transition"
                                            >
                                                <Plus className="size-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-muted-foreground mt-1 pl-[18px] text-xs tabular-nums">
                                        {mxn(total)} MXN
                                    </div>
                                    <div className="bg-border mt-2.5 h-[3px] overflow-hidden rounded-full">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${style.dot}`}
                                            style={{
                                                width: `${items.length ? Math.max((list.length / items.length) * 100, list.length ? 8 : 0) : 0}%`,
                                            }}
                                        />
                                    </div>
                                </header>

                                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-0.5 pt-0.5 pb-2">
                                    {list.length === 0 && !isOver && (
                                        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed py-10 text-xs">
                                            <Kanban className="size-5 opacity-40" />
                                            Sin oportunidades
                                        </div>
                                    )}

                                    {list.map((o) => {
                                        const overdue =
                                            !closedStage &&
                                            o.expected_close_date !== null &&
                                            o.expected_close_date < today;
                                        const showGhost =
                                            isOver &&
                                            overCard === o.id &&
                                            dragId !== o.id;

                                        return (
                                            <div
                                                key={o.id}
                                                className="flex flex-col gap-2.5"
                                            >
                                                {showGhost && <Ghost />}
                                                <article
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.effectAllowed =
                                                            'move';
                                                        e.dataTransfer.setData(
                                                            'text/plain',
                                                            String(o.id),
                                                        );
                                                        setDragId(o.id);
                                                    }}
                                                    onDragEnd={endDrag}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setOverStage(stage.key);
                                                        setOverCard(o.id);
                                                    }}
                                                    className={`group bg-card relative cursor-grab overflow-hidden rounded-xl border p-3.5 pl-4 shadow-sm transition-all duration-200 active:cursor-grabbing ${
                                                        dragId === o.id
                                                            ? 'scale-95 rotate-1 opacity-40'
                                                            : 'hover:border-ring/60 hover:-translate-y-0.5 hover:shadow-md'
                                                    } ${justDropped === o.id ? `animate-in zoom-in-95 ring-2 duration-300 ${style.ring}` : ''}`}
                                                >
                                                    <span
                                                        className={`absolute inset-y-0 left-0 w-1 ${style.dot}`}
                                                    />
                                                    <div className="flex items-start gap-2">
                                                        <Link
                                                            href={`/oportunidades/${o.id}`}
                                                            draggable={false}
                                                            className={`flex-1 text-[13.5px] leading-snug font-semibold hover:underline ${stage.key === 'perdido' ? 'text-muted-foreground' : ''}`}
                                                        >
                                                            {o.name}
                                                        </Link>
                                                        <GripVertical className="text-muted-foreground/40 group-hover:text-muted-foreground size-4 shrink-0 transition" />
                                                    </div>

                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="bg-accent text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                                            {initials(o.client)}
                                                        </span>
                                                        <span className="text-muted-foreground truncate text-xs">
                                                            {o.client ??
                                                                'Sin cliente'}
                                                        </span>
                                                        {isAdmin && o.owner && (
                                                            <span
                                                                title="Vendedor"
                                                                className="bg-secondary text-muted-foreground ml-auto max-w-24 shrink-0 truncate rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                                            >
                                                                {o.owner}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 flex items-baseline justify-between gap-2">
                                                        <span className="text-[15px] font-semibold tracking-tight tabular-nums">
                                                            {formatMoney(
                                                                o.value.amount,
                                                                o.value
                                                                    .currency,
                                                            )}
                                                        </span>
                                                        <span className="bg-secondary text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold">
                                                            {o.value.currency}
                                                        </span>
                                                    </div>

                                                    <div className="text-muted-foreground mt-2.5 flex items-center gap-3 border-t pt-2.5 text-xs">
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="size-3.5" />
                                                            {o.quotes_count}
                                                        </span>
                                                        {o.expected_close_date && (
                                                            <span
                                                                className={`flex items-center gap-1 ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : ''}`}
                                                            >
                                                                <CalendarDays className="size-3.5" />
                                                                {fmtDate(
                                                                    o.expected_close_date,
                                                                )}
                                                                {overdue &&
                                                                    ' · vencida'}
                                                            </span>
                                                        )}
                                                        {/* Alternativa al arrastre (táctil / teclado) */}
                                                        <select
                                                            aria-label="Mover a etapa"
                                                            value={o.stage}
                                                            onChange={(e) =>
                                                                requestMove(
                                                                    o.id,
                                                                    e.target
                                                                        .value as StageKey,
                                                                    null,
                                                                )
                                                            }
                                                            className="text-muted-foreground hover:text-foreground ml-auto max-w-24 cursor-pointer rounded bg-transparent py-0.5 text-[11px] outline-none"
                                                        >
                                                            {stages.map((s) => (
                                                                <option
                                                                    key={s.key}
                                                                    value={
                                                                        s.key
                                                                    }
                                                                >
                                                                    {s.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </article>
                                            </div>
                                        );
                                    })}

                                    {isOver && overCard === null && <Ghost />}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {celebration}

            <LostReasonDialog
                open={pendingLost !== null}
                name={lostTarget?.name ?? ''}
                onCancel={() => setPendingLost(null)}
                onConfirm={(reason) => {
                    if (pendingLost) {
                        moveTo(
                            pendingLost.id,
                            'perdido',
                            pendingLost.before,
                            reason,
                        );
                    }

                    setPendingLost(null);
                }}
            />

            {creating && (
                <NewOpportunityDialog
                    clients={clients}
                    onClose={() => setCreating(false)}
                />
            )}
        </>
    );
}

function NewOpportunityDialog({
    clients,
    onClose,
}: {
    clients: { id: number; name: string }[];
    onClose: () => void;
}) {
    const form = useForm({
        name: '',
        client_id: '',
        estimated_amount: '',
        expected_close_date: '',
        notes: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/oportunidades', { onSuccess: onClose });
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Nueva oportunidad</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label className="text-[12.5px]">Nombre *</Label>
                        <Input
                            autoFocus
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                        />
                        <InputError message={form.errors.name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-[12.5px]">Cliente</Label>
                        <select
                            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                            value={form.data.client_id}
                            onChange={(e) =>
                                form.setData('client_id', e.target.value)
                            }
                        >
                            <option value="">— Sin cliente —</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.client_id} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">
                                Monto estimado (MXN)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step="any"
                                value={form.data.estimated_amount}
                                onChange={(e) =>
                                    form.setData(
                                        'estimated_amount',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={form.errors.estimated_amount}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">
                                Cierre estimado
                            </Label>
                            <Input
                                type="date"
                                value={form.data.expected_close_date}
                                onChange={(e) =>
                                    form.setData(
                                        'expected_close_date',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Crear
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

OpportunitiesIndex.layout = {
    breadcrumbs: [{ title: 'Oportunidades', href: '/oportunidades' }],
};
