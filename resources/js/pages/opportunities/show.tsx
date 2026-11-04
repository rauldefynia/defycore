import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    FilePlus,
    Link2,
    Pencil,
    Save,
    Star,
    Trash2,
    Unlink,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ContactSearch } from '@/components/contact-search';
import { LostReasonDialog } from '@/components/opportunity-lost-dialog';
import { Button } from '@/components/ui/button';
import { useWinCelebration } from '@/components/win-celebration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STAGE_STYLES } from '@/lib/opportunity';
import type { Stage, StageKey } from '@/lib/opportunity';
import { formatMoney } from '@/lib/quote-calc';

type QuoteRow = {
    id: number;
    number: string;
    name: string;
    date: string | null;
    due_date: string | null;
    currency: string;
    total: number;
    active_with_client: boolean;
};

type ContactRow = {
    id: number;
    name: string;
    position: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
};

type Opp = {
    id: number;
    name: string;
    stage: StageKey;
    client: string | null;
    client_id: number | null;
    estimated_amount: number;
    expected_close_date: string | null;
    notes: string | null;
    lost_reason: string | null;
    quotes_count: number;
    value: { amount: number; currency: string; amount_mxn: number };
};

const card = 'bg-card rounded-xl border p-5 shadow-sm';
const input =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]';
const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-MX') : '—';

export default function OpportunityShow({
    opportunity,
    quotes,
    availableQuotes,
    contacts,
    stages,
    clients,
}: {
    opportunity: Opp;
    quotes: QuoteRow[];
    availableQuotes: QuoteRow[];
    contacts: ContactRow[];
    stages: Stage[];
    clients: { id: number; name: string }[];
}) {
    const form = useForm({
        name: opportunity.name,
        client_id: opportunity.client_id ? String(opportunity.client_id) : '',
        estimated_amount: opportunity.estimated_amount,
        expected_close_date: opportunity.expected_close_date ?? '',
        notes: opportunity.notes ?? '',
    });
    const [attachId, setAttachId] = useState('');
    const [contactId, setContactId] = useState('');
    const [contactRole, setContactRole] = useState('');
    // Cambiar la clave reinicia el buscador tras anexar.
    const [contactKey, setContactKey] = useState(0);

    const attachContact = () => {
        if (!contactId) return;

        router.post(
            `/oportunidades/${opportunity.id}/contactos`,
            { contact_id: contactId, role: contactRole || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setContactId('');
                    setContactRole('');
                    setContactKey((k) => k + 1);
                },
            },
        );
    };

    const detachContact = (c: ContactRow) => {
        if (confirm(`¿Quitar a ${c.name} de esta oportunidad?`)) {
            router.delete(
                `/oportunidades/${opportunity.id}/contactos/${c.id}`,
                { preserveScroll: true },
            );
        }
    };
    const [askLost, setAskLost] = useState(false);
    const style = STAGE_STYLES[opportunity.stage];
    const hasQuotes = quotes.length > 0;

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/oportunidades/${opportunity.id}`, { preserveScroll: true });
    };

    const { celebrate, node: celebration } = useWinCelebration();

    const changeStage = (stage: StageKey, lostReason?: string) =>
        router.patch(
            `/oportunidades/${opportunity.id}/mover`,
            { stage, lost_reason: lostReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (stage === 'ganado' && opportunity.stage !== 'ganado') {
                        celebrate(
                            opportunity.name,
                            `${formatMoney(opportunity.value.amount, opportunity.value.currency)} ${opportunity.value.currency}`,
                        );
                    }
                },
            },
        );

    const remove = () => {
        if (
            confirm(
                `¿Eliminar la oportunidad "${opportunity.name}"?\nSus cotizaciones se conservarán.`,
            )
        ) {
            router.delete(`/oportunidades/${opportunity.id}`);
        }
    };

    const detach = (q: QuoteRow) => {
        if (
            confirm(`¿Desanexar la cotización ${q.number} de esta oportunidad?`)
        ) {
            router.delete(
                `/oportunidades/${opportunity.id}/cotizaciones/${q.id}`,
                {
                    preserveScroll: true,
                },
            );
        }
    };

    return (
        <>
            <Head title={opportunity.name} />
            <div className="flex max-w-[1320px] flex-col gap-5 px-6 pt-4 pb-11">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            {opportunity.name}
                        </h1>
                        <p className="text-muted-foreground text-[14.5px]">
                            {opportunity.client ?? 'Sin cliente'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            aria-label="Etapa"
                            className={`${input} w-auto font-medium ${style.chip}`}
                            value={opportunity.stage}
                            onChange={(e) => {
                                const next = e.target.value as StageKey;

                                if (next === 'perdido') {
                                    setAskLost(true);
                                } else {
                                    changeStage(next);
                                }
                            }}
                        >
                            {stages.map((s) => (
                                <option key={s.key} value={s.key}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <Button variant="ghost" asChild>
                            <Link href="/oportunidades">
                                Volver al pipeline
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={remove}>
                            <Trash2 className="text-red-600" /> Eliminar
                        </Button>
                    </div>
                </div>

                {opportunity.stage === 'perdido' && opportunity.lost_reason && (
                    <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
                        <strong>Motivo de la pérdida:</strong>{' '}
                        {opportunity.lost_reason}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
                    <form
                        onSubmit={save}
                        className={`${card} grid content-start gap-4`}
                    >
                        <h2 className="text-[15px] font-semibold">Datos</h2>
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">Nombre *</Label>
                            <Input
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
                                className={input}
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
                                    disabled={hasQuotes}
                                    value={form.data.estimated_amount}
                                    onChange={(e) =>
                                        form.setData(
                                            'estimated_amount',
                                            e.target.value as never,
                                        )
                                    }
                                />
                                {hasQuotes && (
                                    <p className="text-muted-foreground text-xs">
                                        Con cotizaciones, el valor lo da la
                                        cotización vigente.
                                    </p>
                                )}
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
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">Notas</Label>
                            <textarea
                                rows={4}
                                className={`${input} h-auto py-2`}
                                value={form.data.notes}
                                onChange={(e) =>
                                    form.setData('notes', e.target.value)
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <span className="text-muted-foreground">
                                    Valor{' '}
                                </span>
                                <strong>
                                    {formatMoney(
                                        opportunity.value.amount,
                                        opportunity.value.currency,
                                    )}{' '}
                                    {opportunity.value.currency}
                                </strong>
                            </div>
                            <Button type="submit" disabled={form.processing}>
                                <Save /> Guardar
                            </Button>
                        </div>
                    </form>

                    <section className={`${card} content-start`}>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-[15px] font-semibold">
                                Cotizaciones ({quotes.length})
                            </h2>
                            <Button asChild>
                                <Link
                                    href={`/cotizaciones/nueva?opportunity=${opportunity.id}`}
                                >
                                    <FilePlus /> Nueva cotización
                                </Link>
                            </Button>
                        </div>

                        {availableQuotes.length > 0 && (
                            <div className="mb-4 flex gap-2">
                                <select
                                    className={input}
                                    value={attachId}
                                    onChange={(e) =>
                                        setAttachId(e.target.value)
                                    }
                                >
                                    <option value="">
                                        Anexar una cotización existente…
                                    </option>
                                    {availableQuotes.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            {q.number} · {q.name} ·{' '}
                                            {formatMoney(q.total, q.currency)}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline"
                                    disabled={!attachId}
                                    onClick={() =>
                                        router.post(
                                            `/oportunidades/${opportunity.id}/cotizaciones`,
                                            { quote_id: attachId },
                                            {
                                                preserveScroll: true,
                                                onSuccess: () =>
                                                    setAttachId(''),
                                            },
                                        )
                                    }
                                >
                                    <Link2 /> Anexar
                                </Button>
                            </div>
                        )}

                        {quotes.length === 0 ? (
                            <p className="text-muted-foreground py-8 text-center text-sm">
                                Aún no hay cotizaciones en esta oportunidad.
                            </p>
                        ) : (
                            <ul className="divide-y rounded-lg border">
                                {quotes.map((q) => (
                                    <li
                                        key={q.id}
                                        className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 text-[13.5px] font-medium">
                                                <Link
                                                    href={`/cotizaciones/${q.id}/editar`}
                                                    className="text-primary"
                                                >
                                                    {q.number}
                                                </Link>
                                                {q.active_with_client && (
                                                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                                                        <Star className="size-3" />
                                                        Vigente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-muted-foreground truncate text-xs">
                                                {q.name} · vence{' '}
                                                {fmtDate(q.due_date)}
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold whitespace-nowrap">
                                            {formatMoney(q.total, q.currency)}{' '}
                                            <span className="text-muted-foreground text-xs font-normal">
                                                {q.currency}
                                            </span>
                                        </div>
                                        <div className="flex gap-1">
                                            {!q.active_with_client && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        router.post(
                                                            `/oportunidades/${opportunity.id}/cotizaciones/${q.id}/vigente`,
                                                            {},
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <Star /> Marcar vigente
                                                </Button>
                                            )}
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                title="Abrir"
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
                                                title="Desanexar"
                                                onClick={() => detach(q)}
                                            >
                                                <Unlink />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className={`${card} content-start lg:col-span-2`}>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[15px] font-semibold">
                                Contactos ({contacts.length})
                            </h2>
                            <Button asChild size="sm" variant="ghost">
                                <Link href="/contactos/nuevo">
                                    <UserPlus /> Nuevo contacto
                                </Link>
                            </Button>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            <ContactSearch
                                key={contactKey}
                                keepSelection
                                className="max-w-sm min-w-60 flex-1"
                                exclude={contacts.map((c) => c.id)}
                                onSelect={(c) =>
                                    setContactId(c.id ? String(c.id) : '')
                                }
                            />
                            <Input
                                className="max-w-52"
                                placeholder="Rol (decisor, técnico…)"
                                maxLength={100}
                                value={contactRole}
                                onChange={(e) => setContactRole(e.target.value)}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!contactId}
                                onClick={attachContact}
                            >
                                <Link2 /> Anexar
                            </Button>
                        </div>

                        {contacts.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Aún no hay contactos en esta oportunidad.
                            </p>
                        ) : (
                            <ul className="grid gap-2 md:grid-cols-2">
                                {contacts.map((c) => (
                                    <li
                                        key={c.id}
                                        className="flex items-center gap-3 rounded-lg border p-3"
                                    >
                                        <span className="bg-accent text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                            {c.name
                                                .split(/\s+/)
                                                .slice(0, 2)
                                                .map((w) => w[0]?.toUpperCase())
                                                .join('')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={`/contactos/${c.id}/editar`}
                                                className="text-primary block truncate text-sm font-medium"
                                            >
                                                {c.name}
                                            </Link>
                                            <div className="text-muted-foreground truncate text-xs">
                                                {[c.role, c.position]
                                                    .filter(Boolean)
                                                    .join(' · ') || '—'}
                                            </div>
                                            <div className="text-muted-foreground truncate text-xs">
                                                {[c.email, c.phone]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </div>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Quitar"
                                            onClick={() => detachContact(c)}
                                        >
                                            <Unlink />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            {celebration}

            <LostReasonDialog
                open={askLost}
                name={opportunity.name}
                onCancel={() => setAskLost(false)}
                onConfirm={(reason) => {
                    changeStage('perdido', reason);
                    setAskLost(false);
                }}
            />
        </>
    );
}

OpportunityShow.layout = {
    breadcrumbs: [
        { title: 'Oportunidades', href: '/oportunidades' },
        { title: 'Detalle', href: '#' },
    ],
};
