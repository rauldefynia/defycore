import { Head, Link, router } from '@inertiajs/react';
import {
    Copy,
    Eye,
    FilePlus,
    Pencil,
    Search,
    Target,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
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
}: {
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

    const remove = (q: QuoteRow) => {
        if (confirm(`¿Eliminar la cotización ${q.number}?`)) {
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
                                        colSpan={8}
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
                <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                    {selected && <QuoteSummary q={selected} />}
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
            <dd className="text-right">{v}</dd>
        </div>
    );
}

function QuoteSummary({ q }: { q: QuoteRow }) {
    const m = (v: number | null) => formatMoney(v ?? 0, q.currency);
    const qty = (n: number) => String(Number(n.toFixed(2)));

    return (
        <>
            <SheetHeader>
                <SheetTitle>{q.number}</SheetTitle>
                <SheetDescription>{q.name}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4">
                <dl className="grid gap-1.5">
                    <Row l="Cliente" v={q.client ?? '—'} />
                    <Row l="Emisor" v={q.issuer ?? '—'} />
                    <Row l="Fecha" v={fmtDate(q.date)} />
                    <Row l="Vence" v={fmtDate(q.due_date)} />
                    <Row
                        l="Moneda"
                        v={
                            q.currency === 'MXN'
                                ? 'MXN'
                                : `${q.currency} (TC ${q.exchange_rate})`
                        }
                    />
                </dl>

                <div>
                    <h3 className="mb-2 text-[13px] font-semibold">
                        Partidas ({q.items.length})
                    </h3>
                    <ul className="flex flex-col divide-y rounded-lg border text-[13px]">
                        {q.items.map((i) => (
                            <li
                                key={i.id}
                                className="flex justify-between gap-3 px-3 py-2"
                            >
                                <span className="min-w-0">
                                    <span className="text-muted-foreground">
                                        {qty(i.quantity)} ×{' '}
                                    </span>
                                    {i.description}
                                </span>
                                <span className="whitespace-nowrap">
                                    {m(i.sale_total_price)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <dl className="grid gap-1.5">
                    <Row l="Subtotal" v={m(q.subtotal)} />
                    <Row l="IVA 16%" v={m(q.tax_amount)} />
                    {q.global_discount_amount > 0 && (
                        <Row
                            l="Descuento general"
                            v={`-${m(q.global_discount_amount)}`}
                        />
                    )}
                    <Row l="TOTAL" v={m(q.total)} strong />
                </dl>

                <dl className="bg-secondary grid gap-1.5 rounded-lg p-3">
                    <Row l="Costo" v={m(q.summary_cost)} />
                    <Row l="Utilidad" v={m(q.summary_profit)} />
                    <Row
                        l="Margen"
                        v={`${q.summary_margin_percent.toFixed(2)}%`}
                    />
                </dl>

                {q.has_payment_plan && (
                    <dl className="grid gap-1.5">
                        <h3 className="text-[13px] font-semibold">
                            Plan de pagos
                        </h3>
                        <Row l="Anticipo" v={m(q.first_payment_amount)} />
                        <Row
                            l={`${q.payment_months} mensualidades de`}
                            v={m(q.monthly_payment_amount)}
                        />
                    </dl>
                )}
            </div>

            <SheetFooter className="flex-row flex-wrap gap-2">
                <Button asChild>
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
