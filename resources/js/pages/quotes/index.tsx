import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    CalendarDays,
    Copy,
    CreditCard,
    Eye,
    FilePlus,
    Landmark,
    Pencil,
    Search,
    Target,
    Trash2,
    TrendingUp,
    UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { confirmAction } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetTitle,
} from '@/components/ui/sheet';
import { formatMoney } from '@/lib/quote-calc';

type QuoteRow = {
    id: number;
    number: string;
    name: string;
    date: string | null;
    due_date: string | null;
    client: string | null;
    issuer: string | null;
    seller: string | null;
    opportunity_id: number | null;
    currency: string;
    exchange_rate: number;
    total: number;
    subtotal: number;
    tax_amount: number;
    global_discount_amount: number;
    summary_cost: number;
    summary_profit: number;
    summary_margin_percent: number;
    has_payment_plan: boolean;
    first_payment_amount: number | null;
    monthly_payment_amount: number | null;
    payment_months: number | null;
    items: {
        id: number;
        description: string;
        quantity: number;
        sale_total_price: number;
    }[];
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-MX') : '—';

export default function QuotesIndex({
    quotes,
    filters,
    isAdmin,
}: {
    isAdmin: boolean;
    quotes: Paginated<QuoteRow>;
    filters: { search: string };
}) {
    const [search, setSearch] = useState(filters.search);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected = quotes.data.find((q) => q.id === selectedId) ?? null;

    const doSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/cotizaciones', { search }, { preserveState: true });
    };

    const remove = async (q: QuoteRow) => {
        if (
            await confirmAction({
                title: `¿Eliminar la cotización ${q.number}?`,
                description: 'Se eliminará junto con todas sus partidas.',
                confirmText: 'Eliminar',
            })
        ) {
            router.delete(`/cotizaciones/${q.id}`);
        }
    };

    return (
        <>
            <Head title="Cotizaciones" />
            <div className="flex max-w-[1320px] flex-col gap-5 px-6 pt-4 pb-11">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            Cotizaciones
                        </h1>
                        <p className="text-muted-foreground text-[14.5px]">
                            {quotes.total} cotizaciones
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/cotizaciones/nueva">
                            <FilePlus /> Nueva cotización
                        </Link>
                    </Button>
                </div>

                <form onSubmit={doSearch} className="flex max-w-md gap-2">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por folio, nombre o cliente"
                    />
                    <Button type="submit" variant="outline">
                        <Search />
                    </Button>
                </form>

                <div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
                    <table className="w-full text-[13.5px]">
                        <thead>
                            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                                <th className="px-4 py-3">Folio</th>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">Cliente</th>
                                {isAdmin && (
                                    <th className="px-4 py-3">Vendedor</th>
                                )}
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Vence</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-right">Margen</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={isAdmin ? 9 : 8}
                                        className="text-muted-foreground px-4 py-10 text-center"
                                    >
                                        No hay cotizaciones todavía.
                                    </td>
                                </tr>
                            )}
                            {quotes.data.map((q) => (
                                <tr
                                    key={q.id}
                                    onClick={() => setSelectedId(q.id)}
                                    className={`hover:bg-secondary cursor-pointer border-b last:border-0 ${selectedId === q.id ? 'bg-secondary' : ''}`}
                                >
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            href={`/cotizaciones/${q.id}/editar`}
                                            className="text-primary"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {q.number}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">{q.name}</td>
                                    <td className="px-4 py-3">
                                        {q.client ?? '—'}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-4 py-3">
                                            {q.seller ?? '—'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        {fmtDate(q.date)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {fmtDate(q.due_date)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                                        {formatMoney(q.total, q.currency)}{' '}
                                        <span className="text-muted-foreground text-xs">
                                            {q.currency}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {q.summary_margin_percent.toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-3">
                                        <div
                                            className="flex justify-end gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                title="Editar"
                                            >
                                                <Link
                                                    href={`/cotizaciones/${q.id}/editar`}
                                                >
                                                    <Pencil />
                                                </Link>
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title={
                                                    q.opportunity_id
                                                        ? 'Ver oportunidad'
                                                        : 'Convertir en oportunidad'
                                                }
                                                onClick={() =>
                                                    q.opportunity_id
                                                        ? router.get(
                                                              `/oportunidades/${q.opportunity_id}`,
                                                          )
                                                        : router.post(
                                                              `/cotizaciones/${q.id}/oportunidad`,
                                                          )
                                                }
                                            >
                                                <Target
                                                    className={
                                                        q.opportunity_id
                                                            ? 'text-primary'
                                                            : ''
                                                    }
                                                />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title="Copiar cotización"
                                                onClick={() =>
                                                    router.post(
                                                        `/cotizaciones/${q.id}/duplicar`,
                                                    )
                                                }
                                            >
                                                <Copy />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title="Eliminar"
                                                onClick={() => remove(q)}
                                            >
                                                <Trash2 className="text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {quotes.links.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                        {quotes.links.map((l, i) => (
                            <Button
                                key={i}
                                size="sm"
                                variant={l.active ? 'default' : 'outline'}
                                disabled={!l.url}
                                onClick={() => l.url && router.get(l.url)}
                                dangerouslySetInnerHTML={{ __html: l.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Sheet
                open={selected !== null}
                onOpenChange={(o) => !o && setSelectedId(null)}
            >
                <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
                    {selected && (
                        <QuoteSummary q={selected} isAdmin={isAdmin} />
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}

function Row({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
    return (
        <div
            className={`flex justify-between gap-3 ${strong ? 'border-t pt-2 text-base font-semibold' : 'text-[13.5px]'}`}
        >
            <dt className={strong ? '' : 'text-muted-foreground'}>{l}</dt>
            <dd className="text-right tabular-nums">{v}</dd>
        </div>
    );
}

function Info({
    icon: Icon,
    label,
    children,
}: {
    icon: LucideIcon;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="bg-secondary text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
                <dt className="text-muted-foreground text-[11px] uppercase">
                    {label}
                </dt>
                <dd className="truncate text-[13.5px] font-medium">
                    {children}
                </dd>
            </div>
        </div>
    );
}

/** Estado de vigencia a partir de la fecha de vencimiento. */
function dueStatus(due: string | null) {
    if (!due) return null;

    const days = Math.ceil(
        (new Date(`${due}T00:00:00`).getTime() -
            new Date().setHours(0, 0, 0, 0)) /
            86_400_000,
    );

    if (days < 0) {
        return {
            text: `Vencida hace ${-days} d`,
            cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        };
    }

    if (days <= 7) {
        return {
            text: days === 0 ? 'Vence hoy' : `Vence en ${days} d`,
            cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        };
    }

    return {
        text: `Vigente · ${days} d`,
        cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
    };
}

function QuoteSummary({ q, isAdmin }: { q: QuoteRow; isAdmin: boolean }) {
    const m = (v: number | null) => formatMoney(v ?? 0, q.currency);
    const qty = (n: number) => String(Number(n.toFixed(2)));
    const status = dueStatus(q.due_date);
    const margin = q.summary_margin_percent;
    const marginTone =
        margin >= 25
            ? 'bg-green-500'
            : margin >= 10
              ? 'bg-amber-500'
              : 'bg-red-500';

    return (
        <>
            <div className="bg-accent/40 border-b px-5 pt-5 pr-12 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="text-primary font-mono text-sm tracking-wide">
                        {q.number}
                    </SheetTitle>
                    {status && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.cls}`}
                        >
                            {status.text}
                        </span>
                    )}
                    {q.opportunity_id && (
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium">
                            Con oportunidad
                        </span>
                    )}
                </div>
                <SheetDescription className="text-foreground mt-1 text-lg leading-snug font-semibold">
                    {q.name}
                </SheetDescription>
            </div>

            <div className="flex flex-1 flex-col gap-5 px-5 py-5">
                <div
                    className="rounded-xl p-4 text-white shadow-sm"
                    style={{ background: 'var(--brand-gradient)' }}
                >
                    <div className="flex items-center justify-between text-xs text-white/70">
                        <span>Total de la cotización</span>
                        <span className="rounded bg-white/15 px-1.5 py-0.5 font-medium text-white">
                            {q.currency}
                            {q.currency !== 'MXN' && ` · TC ${q.exchange_rate}`}
                        </span>
                    </div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                        {m(q.total)}
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                        Subtotal {m(q.subtotal)} + IVA {m(q.tax_amount)}
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <Info icon={Building2} label="Cliente">
                        {q.client ?? '—'}
                    </Info>
                    <Info icon={Landmark} label="Emisor">
                        {q.issuer ?? '—'}
                    </Info>
                    {isAdmin && (
                        <Info icon={UserRound} label="Vendedor">
                            {q.seller ?? '—'}
                        </Info>
                    )}
                    <Info icon={CalendarDays} label="Fecha">
                        {fmtDate(q.date)}
                    </Info>
                    <Info icon={CalendarClock} label="Vence">
                        {fmtDate(q.due_date)}
                    </Info>
                </dl>

                <section>
                    <h3 className="mb-2 flex items-center justify-between text-[13px] font-semibold">
                        Partidas
                        <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
                            {q.items.length}
                        </span>
                    </h3>
                    <ul className="flex max-h-56 flex-col divide-y overflow-y-auto rounded-lg border text-[13px]">
                        {q.items.map((i) => (
                            <li
                                key={i.id}
                                className="flex items-start justify-between gap-3 px-3 py-2"
                            >
                                <span className="min-w-0">
                                    <span className="bg-secondary text-muted-foreground mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium">
                                        {qty(i.quantity)}×
                                    </span>
                                    {i.description}
                                </span>
                                <span className="font-medium whitespace-nowrap tabular-nums">
                                    {m(i.sale_total_price)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <dl className="grid gap-1.5 rounded-lg border p-3">
                    <Row l="Subtotal" v={m(q.subtotal)} />
                    {q.global_discount_amount > 0 && (
                        <Row
                            l="Descuento general"
                            v={`-${m(q.global_discount_amount)}`}
                        />
                    )}
                    <Row l="IVA 16%" v={m(q.tax_amount)} />
                    <Row l="Total" v={m(q.total)} strong />
                </dl>

                <section className="bg-secondary/70 rounded-lg p-3">
                    <div className="mb-2 flex items-center justify-between text-[13px]">
                        <h3 className="flex items-center gap-1.5 font-semibold">
                            <TrendingUp className="size-4" /> Rentabilidad
                        </h3>
                        <span className="font-semibold tabular-nums">
                            {margin.toFixed(2)}%
                        </span>
                    </div>
                    <div
                        className="bg-background h-2 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-valuenow={Math.round(margin)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Margen"
                    >
                        <div
                            className={`h-full rounded-full transition-all ${marginTone}`}
                            style={{
                                width: `${Math.max(0, Math.min(100, margin))}%`,
                            }}
                        />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                        <div>
                            <dt className="text-muted-foreground text-[11px] uppercase">
                                Costo
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {m(q.summary_cost)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-[11px] uppercase">
                                Utilidad
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {m(q.summary_profit)}
                            </dd>
                        </div>
                    </dl>
                </section>

                {q.has_payment_plan && (
                    <section className="rounded-lg border p-3">
                        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                            <CreditCard className="size-4" /> Plan de pagos
                        </h3>
                        <dl className="grid gap-1.5">
                            <Row l="Anticipo" v={m(q.first_payment_amount)} />
                            <Row
                                l={`${q.payment_months} mensualidades de`}
                                v={m(q.monthly_payment_amount)}
                            />
                        </dl>
                    </section>
                )}
            </div>

            <SheetFooter className="bg-background sticky bottom-0 flex-row flex-wrap gap-2 border-t px-5 py-3">
                <Button asChild className="flex-1">
                    <Link href={`/cotizaciones/${q.id}/editar`}>
                        <Pencil /> Abrir cotización
                    </Link>
                </Button>
                <Button
                    variant="outline"
                    onClick={() =>
                        window.open(
                            `/cotizaciones/${q.id}/pdf?type=client_mxn`,
                            '_blank',
                        )
                    }
                >
                    <Eye /> Vista previa
                </Button>
                <Button
                    variant="outline"
                    onClick={() =>
                        q.opportunity_id
                            ? router.get(`/oportunidades/${q.opportunity_id}`)
                            : router.post(`/cotizaciones/${q.id}/oportunidad`)
                    }
                >
                    <Target />
                    {q.opportunity_id
                        ? 'Ver oportunidad'
                        : 'Convertir en oportunidad'}
                </Button>
            </SheetFooter>
        </>
    );
}

QuotesIndex.layout = {
    breadcrumbs: [{ title: 'Cotizaciones', href: '/cotizaciones' }],
};
