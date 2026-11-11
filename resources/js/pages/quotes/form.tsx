import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FileText,
    Plus,
    Printer,
    Mail,
    Save,
    Target,
    TriangleAlert,
    Trash2,
    Eye,
    Pencil,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { confirmAction } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import QuoteEmailDialog from '@/components/quote-email-dialog';
import type { SentEmail } from '@/components/quote-email-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    CURRENCIES,
    calcQuote,
    formatMoney,
    formatPercent,
    parseNum,
} from '@/lib/quote-calc';
import type { ItemInput } from '@/lib/quote-calc';

type Client = {
    id: number;
    name: string;
    rfc: string;
    zip: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
};

type Issuer = {
    id: number;
    name: string;
    rfc: string | null;
    address: string | null;
    zip: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type QuoteProp = Record<string, any> & { id: number; number: string };

const blankItem = (): ItemInput => ({
    item_type: 'producto',
    description: '',
    detail: '',
    sku: '',
    quantity: 1,
    cost_unit_without_discount: 0,
    discount_percent: 0,
    target_margin_percent: 0,
    client_discount_percent: 0,
});

const sel =
    'border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';
const card = 'bg-card rounded-xl border p-5 shadow-sm';
const h2 = 'mb-4 text-[15px] font-semibold';

function Field({
    label,
    error,
    children,
    className = '',
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`grid gap-1.5 ${className}`}>
            <Label className="text-[12.5px]">{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

function csrf(): string {
    const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return m ? decodeURIComponent(m[1]) : '';
}

async function api<T>(
    method: string,
    url: string,
    body?: unknown,
): Promise<{ ok: boolean; data: T; errors?: Record<string, string[]> }> {
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': csrf(),
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
    });
    const json = await res.json().catch(() => ({}));

    return res.ok
        ? { ok: true, data: json as T }
        : { ok: false, data: json as T, errors: json.errors };
}

/** Diálogo genérico para alta/edición de cliente o emisor. */
function CatalogDialog<T extends { id: number }>({
    open,
    onClose,
    title,
    fields,
    initial,
    url,
    method,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    fields: { key: string; label: string; required?: boolean }[];
    initial: Record<string, string>;
    url: string;
    method: 'POST' | 'PUT';
    onSaved: (row: T) => void;
}) {
    const [values, setValues] = useState<Record<string, string>>(initial);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        const r = await api<T>(method, url, values);
        setBusy(false);

        if (r.ok) {
            onSaved(r.data);
            onClose();
        } else {
            setErrors(r.errors ?? {});
            toast.error('Revisa los datos capturados.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                    {fields.map((f) => (
                        <Field
                            key={f.key}
                            label={f.label + (f.required ? ' *' : '')}
                            error={errors[f.key]?.[0]}
                        >
                            <Input
                                value={values[f.key] ?? ''}
                                onChange={(e) =>
                                    setValues({
                                        ...values,
                                        [f.key]: e.target.value,
                                    })
                                }
                            />
                        </Field>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={submit} disabled={busy}>
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const CLIENT_FIELDS = [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'rfc', label: 'RFC', required: true },
    { key: 'contact', label: 'Contacto' },
    { key: 'email', label: 'Correo' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'address', label: 'Dirección' },
    { key: 'zip', label: 'C.P.' },
    { key: 'city', label: 'Ciudad' },
    { key: 'state', label: 'Estado' },
    { key: 'country', label: 'País' },
];

const ISSUER_FIELDS = [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'rfc', label: 'RFC' },
    { key: 'address', label: 'Dirección' },
    { key: 'zip', label: 'C.P.' },
    { key: 'city', label: 'Ciudad' },
    { key: 'state', label: 'Estado' },
    { key: 'country', label: 'País' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Correo' },
    { key: 'website', label: 'Sitio web' },
];

const toStr = (r: object | null, keys: { key: string }[]) =>
    Object.fromEntries(
        keys.map((k) => [
            k.key,
            String((r as Record<string, unknown> | null)?.[k.key] ?? ''),
        ]),
    );

const STEPS = [
    'Datos generales',
    'Cliente y moneda',
    'Partidas',
    'Descuento, pagos y resumen',
];

/** Fase del formulario a la que pertenece cada campo con error. */
function stepOfError(key: string): number {
    if (key.startsWith('items')) return 2;
    if (
        key.startsWith('global_discount') ||
        key.startsWith('first_payment') ||
        key.startsWith('payment_') ||
        key === 'has_payment_plan'
    ) {
        return 3;
    }
    if (
        [
            'client_id',
            'contact_id',
            'issuer_id',
            'currency',
            'exchange_rate',
        ].includes(key)
    )
        return 1;

    return 0;
}

export default function QuoteForm({
    quote,
    clients: clientsProp,
    issuers: issuersProp,
    contacts = [],
    opportunities,
    emails = [],
    defaults,
}: {
    emails?: SentEmail[];
    quote: QuoteProp | null;
    clients: Client[];
    issuers: Issuer[];
    contacts?: {
        id: number;
        name: string;
        position: string | null;
        client_id: number | null;
    }[];
    opportunities: { id: number; name: string }[];
    defaults: {
        date: string;
        due_date: string;
        opportunity_id?: number;
        client_id?: number | null;
        name?: string;
    } | null;
}) {
    const [clients, setClients] = useState(clientsProp);
    const [issuers, setIssuers] = useState(issuersProp);
    const [dialog, setDialog] = useState<
        null | 'client' | 'issuer-new' | 'issuer-edit'
    >(null);
    const [emailOpen, setEmailOpen] = useState(false);

    const [step, setStep] = useState(0);
    // 1 = avanza (entra desde la derecha), -1 = retrocede (entra desde la izquierda)
    const [dir, setDir] = useState<1 | -1>(1);

    const form = useForm({
        name: quote?.name ?? defaults?.name ?? '',
        opportunity_id: quote?.opportunity_id
            ? String(quote.opportunity_id)
            : defaults?.opportunity_id
              ? String(defaults.opportunity_id)
              : '',
        date: quote?.date ?? defaults?.date ?? '',
        due_date: quote?.due_date ?? defaults?.due_date ?? '',
        delivery_unit: quote?.delivery_unit ?? 'dias',
        delivery_days_min: quote?.delivery_days_min ?? 1,
        delivery_days_max: quote?.delivery_days_max ?? 5,
        notes: quote?.notes ?? '',
        client_id: quote?.client_id
            ? String(quote.client_id)
            : defaults?.client_id
              ? String(defaults.client_id)
              : '',
        contact_id: quote?.contact_id ? String(quote.contact_id) : '',
        issuer_id: quote?.issuer_id ? String(quote.issuer_id) : '',
        currency: quote?.currency ?? 'MXN',
        exchange_rate: quote?.exchange_rate ?? 1,
        show_mxn_equivalent: quote?.show_mxn_equivalent ?? false,
        global_discount_type: (quote?.global_discount_type ?? 'percentage') as
            | 'percentage'
            | 'fixed',
        global_discount_value: quote?.global_discount_value ?? 0,
        has_payment_plan: quote?.has_payment_plan ?? false,
        first_payment_type: (quote?.first_payment_type ?? 'percentage') as
            | 'percentage'
            | 'fixed',
        first_payment_value: quote?.first_payment_value ?? 50,
        first_payment_date: quote?.first_payment_date ?? '',
        payment_months: quote?.payment_months ?? 1,
        payment_terms: quote?.payment_terms ?? '',
        items: (quote?.items?.length
            ? quote.items.map((i: Record<string, unknown>): ItemInput => ({
                  item_type: i.item_type as ItemInput['item_type'],
                  description: String(i.description ?? ''),
                  detail: String(i.detail ?? ''),
                  sku: String(i.sku ?? ''),
                  quantity: i.quantity as number,
                  cost_unit_without_discount:
                      i.cost_unit_without_discount as number,
                  discount_percent: i.discount_percent as number,
                  target_margin_percent: i.target_margin_percent as number,
                  client_discount_percent: i.client_discount_percent as number,
              }))
            : [blankItem()]) as ItemInput[],
    });

    const { data, setData, errors } = form;
    const isMxn = data.currency === 'MXN';
    const fx = isMxn ? 1 : Math.max(parseNum(data.exchange_rate), 0);
    const showMxn = !isMxn && data.show_mxn_equivalent;
    const calc = useMemo(
        () => calcQuote({ ...data, exchange_rate: fx }, data.items),
        [data, fx],
    );
    const cur = data.currency;
    const money = (v: number) => formatMoney(v, cur);
    const mxn = (v: number) => formatMoney(v * fx, 'MXN');
    const err = (k: string) => (errors as Record<string, string>)[k];

    const setItem = (idx: number, patch: Partial<ItemInput>) =>
        setData(
            'items',
            data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
        );

    const addItem = () => setData('items', [...data.items, blankItem()]);
    const removeItem = (idx: number) =>
        data.items.length > 1 &&
        setData(
            'items',
            data.items.filter((_, i) => i !== idx),
        );

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        for (let i = 0; i < STEPS.length; i++) {
            if (!validateStep(i)) {
                setStep(i);

                return;
            }
        }

        const opts = {
            preserveScroll: true,
            onError: (errs: Record<string, string>) => {
                const first = Object.keys(errs)[0];
                if (first) setStep(stepOfError(first));
                toast.error('Revisa los campos marcados.');
            },
        };

        if (quote) {
            form.put(`/cotizaciones/${quote.id}`, opts);
        } else {
            form.post('/cotizaciones', opts);
        }
    };

    /** Valida la fase actual antes de avanzar. */
    const validateStep = (n: number): boolean => {
        form.clearErrors();
        const bad: Record<string, string> = {};

        if (n === 0) {
            if (!data.name.trim()) bad.name = 'El nombre es requerido.';
            if (!data.date) bad.date = 'La fecha es requerida.';
            if (data.due_date && data.due_date < data.date) {
                bad.due_date =
                    'El vencimiento no puede ser anterior a la fecha.';
            }
        }

        if (n === 1 && !isMxn && !(parseNum(data.exchange_rate) > 0)) {
            bad.exchange_rate = 'Captura un tipo de cambio mayor a 0.';
        }

        if (n === 2) {
            data.items.forEach((it, i) => {
                if (!it.description.trim()) {
                    bad[`items.${i}.description`] =
                        'La descripción es requerida.';
                }

                if (parseNum(it.quantity) < 1) {
                    bad[`items.${i}.quantity`] = 'La cantidad mínima es 1.';
                }
            });
        }

        if (n === 3 && data.has_payment_plan && !data.first_payment_date) {
            bad.first_payment_date = 'La fecha del anticipo es requerida.';
        }

        if (Object.keys(bad).length) {
            form.setError(bad as never);
            toast.error('Completa los campos marcados para continuar.');

            return false;
        }

        return true;
    };

    const goTo = (n: number) => {
        // Hacia atrás es libre; hacia adelante se valida cada fase intermedia.
        for (let i = step; i < n; i++) {
            if (!validateStep(i)) {
                setStep(i);

                return;
            }
        }

        setDir(n >= step ? 1 : -1);
        setStep(n);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const pdf = (type: string, download = false) =>
        window.open(
            `/cotizaciones/${quote?.id}/pdf?type=${type}${download ? '&download=1' : ''}`,
            '_blank',
        );

    const selectedIssuer = issuers.find((i) => String(i.id) === data.issuer_id);

    const deleteIssuer = async () => {
        if (
            !selectedIssuer ||
            !(await confirmAction({
                title: '¿Eliminar este emisor del catálogo?',
                confirmText: 'Eliminar',
            }))
        ) {
            return;
        }

        await api('DELETE', `/cotizaciones/emisores/${selectedIssuer.id}`);
        setIssuers(issuers.filter((i) => i.id !== selectedIssuer.id));
        setData('issuer_id', '');
    };

    const num = (
        k: keyof typeof data,
        props: React.ComponentProps<typeof Input> = {},
    ) => (
        <Input
            type="number"
            step="any"
            value={data[k] as number | string}
            onChange={(e) => setData(k, e.target.value as never)}
            {...props}
        />
    );

    return (
        <>
            <Head
                title={
                    quote ? `Cotización ${quote.number}` : 'Nueva cotización'
                }
            />
            <form
                onSubmit={save}
                className="flex max-w-[1320px] flex-col gap-5 px-6 pt-4 pb-11"
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            {quote ? quote.number : 'Nueva cotización'}
                        </h1>
                        <p className="text-muted-foreground text-[14.5px]">
                            Todos los cálculos se actualizan en vivo.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {quote && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={form.isDirty}
                                        title={
                                            form.isDirty
                                                ? 'Guarda los cambios para generar el PDF'
                                                : ''
                                        }
                                    >
                                        <Printer /> Exportar PDF
                                        <ChevronDown />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-60"
                                >
                                    <DropdownMenuLabel>
                                        Descargar
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onSelect={() => pdf('internal', true)}
                                    >
                                        <Printer /> PDF Calculadora
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => pdf('client_mxn', true)}
                                    >
                                        <FileText /> PDF Cotización MXN
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => pdf('client_usd', true)}
                                    >
                                        <FileText /> PDF Cotización USD
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>
                                        Vista previa
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onSelect={() => pdf('internal')}
                                    >
                                        <Eye /> Calculadora
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => pdf('client_mxn')}
                                    >
                                        <Eye /> Cotización MXN
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() => pdf('client_usd')}
                                    >
                                        <Eye /> Cotización USD
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {quote && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.isDirty}
                                title={
                                    form.isDirty
                                        ? 'Guarda los cambios para enviar la cotización'
                                        : ''
                                }
                                onClick={() => setEmailOpen(true)}
                            >
                                <Mail /> Enviar por correo
                            </Button>
                        )}
                        {quote &&
                            (quote.opportunity_id ? (
                                <Button type="button" variant="outline" asChild>
                                    <Link
                                        href={`/oportunidades/${quote.opportunity_id}`}
                                    >
                                        <Target /> Ver oportunidad
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        router.post(
                                            `/cotizaciones/${quote.id}/oportunidad`,
                                        )
                                    }
                                >
                                    <Target /> Convertir en oportunidad
                                </Button>
                            ))}
                        <Button type="button" variant="ghost" asChild>
                            <Link href="/cotizaciones">Volver</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            <Save /> Guardar
                        </Button>
                    </div>
                </div>

                {/* Fases */}
                <nav className="bg-card sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 shadow-sm">
                    <ol className="flex flex-1 flex-wrap gap-2">
                        {STEPS.map((label, i) => {
                            const done = i < step;
                            const active = i === step;

                            return (
                                <li key={label}>
                                    <button
                                        type="button"
                                        onClick={() => goTo(i)}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                                    >
                                        <span
                                            className={`flex size-5 items-center justify-center rounded-full text-[11px] ${active ? 'bg-white/25' : done ? 'bg-green-600 text-white' : 'bg-secondary text-muted-foreground'}`}
                                        >
                                            {done ? (
                                                <Check className="size-3" />
                                            ) : (
                                                i + 1
                                            )}
                                        </span>
                                        <span className="hidden sm:inline">
                                            {label}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                    <div className="text-right text-sm">
                        <span className="text-muted-foreground">Total </span>
                        <strong>{money(calc.total)}</strong>
                    </div>
                </nav>

                <div
                    key={step}
                    className={`animate-in fade-in flex flex-col gap-5 duration-400 motion-reduce:[--tw-enter-translate-x:0] ${dir > 0 ? 'slide-in-from-right-8' : 'slide-in-from-left-8'}`}
                >
                    {/* Datos generales */}
                    {step === 0 && (
                        <section className={card}>
                            <h2 className={h2}>Datos generales</h2>
                            <div className="grid gap-4 md:grid-cols-4">
                                <Field
                                    label="Nombre de la cotización *"
                                    error={err('name')}
                                    className="md:col-span-2"
                                >
                                    <Input
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                    />
                                </Field>
                                <Field label="Fecha" error={err('date')}>
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) =>
                                            setData('date', e.target.value)
                                        }
                                    />
                                </Field>
                                <Field
                                    label="Vencimiento"
                                    error={err('due_date')}
                                >
                                    <Input
                                        type="date"
                                        min={data.date}
                                        value={data.due_date}
                                        onChange={(e) =>
                                            setData('due_date', e.target.value)
                                        }
                                    />
                                </Field>

                                <Field
                                    label="Entrega"
                                    error={err('delivery_unit')}
                                >
                                    <select
                                        className={sel}
                                        value={data.delivery_unit}
                                        onChange={(e) =>
                                            setData(
                                                'delivery_unit',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="dias">Días</option>
                                        <option value="semanas">Semanas</option>
                                        <option value="meses">Meses</option>
                                        <option value="personalizado">
                                            Términos personalizados
                                        </option>
                                    </select>
                                </Field>
                                {data.delivery_unit !== 'personalizado' ? (
                                    <>
                                        <Field
                                            label="Entrega mínima"
                                            error={err('delivery_days_min')}
                                        >
                                            {num('delivery_days_min', {
                                                min: 0,
                                            })}
                                        </Field>
                                        <Field
                                            label="Entrega máxima"
                                            error={err('delivery_days_max')}
                                        >
                                            {num('delivery_days_max', {
                                                min: 0,
                                            })}
                                        </Field>
                                    </>
                                ) : (
                                    <Field
                                        label="Términos y condiciones"
                                        error={err('notes')}
                                        className="md:col-span-3"
                                    >
                                        <textarea
                                            rows={4}
                                            className={`${sel} h-auto py-2`}
                                            value={data.notes}
                                            onChange={(e) =>
                                                setData('notes', e.target.value)
                                            }
                                        />
                                    </Field>
                                )}
                            </div>
                        </section>
                    )}

                    {step === 1 && (
                        <>
                            {/* Cliente y emisor */}
                            <section
                                className={`${card} grid gap-6 md:grid-cols-2`}
                            >
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[15px] font-semibold">
                                            Cliente
                                        </h2>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setDialog('client')}
                                        >
                                            <Plus /> Nuevo
                                        </Button>
                                    </div>
                                    <select
                                        className={sel}
                                        value={data.client_id}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setData((d) => ({
                                                ...d,
                                                client_id: next,
                                                // El contacto de otro cliente deja de aplicar.
                                                contact_id: contacts.some(
                                                    (c) =>
                                                        String(c.id) ===
                                                            d.contact_id &&
                                                        (c.client_id === null ||
                                                            String(
                                                                c.client_id,
                                                            ) === next),
                                                )
                                                    ? d.contact_id
                                                    : '',
                                            }));
                                        }}
                                    >
                                        <option value="">
                                            — Sin cliente —
                                        </option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.rfc})
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={err('client_id')} />

                                    <div className="mt-2 grid gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12.5px] font-medium">
                                                Contacto de atención
                                            </span>
                                            <Link
                                                href="/contactos/nuevo"
                                                className="text-primary text-xs"
                                            >
                                                Administrar contactos
                                            </Link>
                                        </div>
                                        <select
                                            className={sel}
                                            disabled={!data.client_id}
                                            value={data.contact_id}
                                            onChange={(e) =>
                                                setData(
                                                    'contact_id',
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                {data.client_id
                                                    ? '— Contacto del cliente —'
                                                    : 'Selecciona primero un cliente'}
                                            </option>
                                            {contacts
                                                .filter(
                                                    (c) =>
                                                        c.client_id === null ||
                                                        String(c.client_id) ===
                                                            data.client_id,
                                                )
                                                .map((c) => (
                                                    <option
                                                        key={c.id}
                                                        value={c.id}
                                                    >
                                                        {c.name}
                                                        {c.position
                                                            ? ` · ${c.position}`
                                                            : ''}
                                                    </option>
                                                ))}
                                        </select>
                                        <InputError
                                            message={err('contact_id')}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[15px] font-semibold">
                                            Emisor
                                        </h2>
                                        <div className="flex gap-1">
                                            {selectedIssuer && (
                                                <>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            setDialog(
                                                                'issuer-edit',
                                                            )
                                                        }
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={deleteIssuer}
                                                    >
                                                        <Trash2 className="text-red-600" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setDialog('issuer-new')
                                                }
                                            >
                                                <Plus /> Nuevo
                                            </Button>
                                        </div>
                                    </div>
                                    <select
                                        className={sel}
                                        value={data.issuer_id}
                                        onChange={(e) =>
                                            setData('issuer_id', e.target.value)
                                        }
                                    >
                                        <option value="">
                                            — Usar datos de la empresa —
                                        </option>
                                        {issuers.map((i) => (
                                            <option key={i.id} value={i.id}>
                                                {i.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={err('issuer_id')} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <h2 className="text-[15px] font-semibold">
                                        Oportunidad
                                    </h2>
                                    <select
                                        className={sel}
                                        value={data.opportunity_id}
                                        onChange={(e) =>
                                            setData(
                                                'opportunity_id',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            — Sin oportunidad —
                                        </option>
                                        {opportunities.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={err('opportunity_id')}
                                    />
                                </div>
                                <p className="text-muted-foreground text-xs md:col-span-2">
                                    Los datos del cliente y del emisor se copian
                                    a la cotización al seleccionarlos; cambios
                                    posteriores del catálogo no alteran
                                    cotizaciones ya creadas.
                                </p>
                            </section>

                            {/* Moneda */}
                            <section className={card}>
                                <h2 className={h2}>Moneda</h2>
                                <div className="grid items-end gap-4 md:grid-cols-4">
                                    <Field
                                        label="Divisa"
                                        error={err('currency')}
                                    >
                                        <select
                                            className={sel}
                                            value={data.currency}
                                            onChange={(e) => {
                                                setData((d) => ({
                                                    ...d,
                                                    currency: e.target.value,
                                                    exchange_rate:
                                                        e.target.value === 'MXN'
                                                            ? 1
                                                            : d.exchange_rate,
                                                    show_mxn_equivalent:
                                                        e.target.value === 'MXN'
                                                            ? false
                                                            : d.show_mxn_equivalent,
                                                }));
                                            }}
                                        >
                                            {CURRENCIES.map((c) => (
                                                <option key={c}>{c}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    {!isMxn && (
                                        <>
                                            <Field
                                                label={`Tipo de cambio (1 ${cur} = X MXN)`}
                                                error={err('exchange_rate')}
                                            >
                                                {num('exchange_rate', {
                                                    min: 0,
                                                })}
                                            </Field>
                                            <label className="flex items-center gap-2 pb-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        data.show_mxn_equivalent
                                                    }
                                                    onChange={(e) =>
                                                        setData(
                                                            'show_mxn_equivalent',
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                Mostrar equivalente en MXN
                                            </label>
                                            <div className="pb-2 text-sm">
                                                Total en MXN:{' '}
                                                <strong>
                                                    {mxn(calc.total)}
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>
                        </>
                    )}

                    {/* Partidas */}
                    {step === 2 && (
                        <section className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[15px] font-semibold">
                                    Partidas
                                </h2>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addItem}
                                >
                                    <Plus /> Agregar partida
                                </Button>
                            </div>
                            <InputError message={err('items')} />

                            {data.items.map((it, idx) => {
                                const c = calc.items[idx];

                                return (
                                    <div key={idx} className={card}>
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-sm font-semibold">
                                                Partida {idx + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                disabled={
                                                    data.items.length === 1
                                                }
                                                onClick={() => removeItem(idx)}
                                                title="Quitar partida"
                                            >
                                                <Trash2 className="text-red-600" />
                                            </Button>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-6">
                                            <Field label="Tipo">
                                                <select
                                                    className={sel}
                                                    value={it.item_type}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            item_type: e.target
                                                                .value as ItemInput['item_type'],
                                                        })
                                                    }
                                                >
                                                    <option value="producto">
                                                        Producto
                                                    </option>
                                                    <option value="servicio">
                                                        Servicio
                                                    </option>
                                                </select>
                                            </Field>
                                            <Field
                                                label="Cantidad"
                                                error={err(
                                                    `items.${idx}.quantity`,
                                                )}
                                            >
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step="any"
                                                    value={it.quantity}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            quantity:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <Field label="SKU (opcional)">
                                                <Input
                                                    value={it.sku}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            sku: e.target.value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <Field
                                                label="Descripción *"
                                                className="md:col-span-3"
                                                error={err(
                                                    `items.${idx}.description`,
                                                )}
                                            >
                                                <Input
                                                    value={it.description}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            description:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <Field
                                                label="Detalle (se imprime en el PDF del cliente)"
                                                className="md:col-span-6"
                                            >
                                                <Input
                                                    value={it.detail}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            detail: e.target
                                                                .value,
                                                        })
                                                    }
                                                />
                                            </Field>

                                            <Field
                                                label="Costo unitario s/desc."
                                                error={err(
                                                    `items.${idx}.cost_unit_without_discount`,
                                                )}
                                            >
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={
                                                        it.cost_unit_without_discount
                                                    }
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            cost_unit_without_discount:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <Field
                                                label="% desc. proveedor"
                                                error={err(
                                                    `items.${idx}.discount_percent`,
                                                )}
                                            >
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step="any"
                                                    value={it.discount_percent}
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            discount_percent:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <Field
                                                label="% ganancia deseada"
                                                error={err(
                                                    `items.${idx}.target_margin_percent`,
                                                )}
                                            >
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={99.99}
                                                    step="any"
                                                    value={
                                                        it.target_margin_percent
                                                    }
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            target_margin_percent:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                            <Field
                                                label="% desc. a cliente"
                                                error={err(
                                                    `items.${idx}.client_discount_percent`,
                                                )}
                                            >
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step="any"
                                                    value={
                                                        it.client_discount_percent
                                                    }
                                                    onChange={(e) =>
                                                        setItem(idx, {
                                                            client_discount_percent:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </Field>
                                        </div>

                                        <div className="bg-secondary mt-4 grid gap-x-6 gap-y-1 rounded-lg px-4 py-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                                            <Calc
                                                l="Costo unit. c/desc."
                                                v={money(c.cost_unit)}
                                            />
                                            <Calc
                                                l="Costo total"
                                                v={money(c.cost_total)}
                                            />
                                            <Calc
                                                l="Precio unit. s/desc. cliente"
                                                v={money(
                                                    c.sale_unit_price_without_client_discount,
                                                )}
                                            />
                                            <Calc
                                                l="Precio unit. venta"
                                                v={money(c.sale_unit_price)}
                                            />
                                            <Calc
                                                l="Precio total venta"
                                                v={money(c.sale_total_price)}
                                                bold
                                            />
                                            <Calc
                                                l="Utilidad unitaria"
                                                v={money(c.unit_profit)}
                                            />
                                            <Calc
                                                l="Utilidad total"
                                                v={money(c.line_profit)}
                                            />
                                            <Calc
                                                l="Margen"
                                                v={formatPercent(
                                                    c.line_margin_percent,
                                                )}
                                            />
                                            {showMxn && (
                                                <>
                                                    <Calc
                                                        l="Costo total (MXN)"
                                                        v={mxn(c.cost_total)}
                                                    />
                                                    <Calc
                                                        l="Venta total (MXN)"
                                                        v={mxn(
                                                            c.sale_total_price,
                                                        )}
                                                    />
                                                    <Calc
                                                        l="Utilidad (MXN)"
                                                        v={mxn(c.line_profit)}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    )}

                    {step === 3 && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            {/* Descuento general + resumen */}
                            <section className={card}>
                                <h2 className={h2}>Descuento general</h2>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Tipo">
                                        <select
                                            className={sel}
                                            value={data.global_discount_type}
                                            onChange={(e) =>
                                                setData(
                                                    'global_discount_type',
                                                    e.target.value as
                                                        | 'percentage'
                                                        | 'fixed',
                                                )
                                            }
                                        >
                                            <option value="percentage">
                                                Porcentaje
                                            </option>
                                            <option value="fixed">
                                                Monto fijo
                                            </option>
                                        </select>
                                    </Field>
                                    <Field
                                        label={
                                            data.global_discount_type ===
                                            'percentage'
                                                ? 'Valor (%)'
                                                : `Monto (${cur})`
                                        }
                                        error={err('global_discount_value')}
                                    >
                                        {num('global_discount_value', {
                                            min: 0,
                                        })}
                                    </Field>
                                </div>
                                <p className="text-muted-foreground mt-2 text-xs">
                                    Se aplica después del IVA, sobre el total
                                    con impuesto.
                                </p>

                                <h2 className={`${h2} mt-6`}>Resumen</h2>
                                <dl className="grid gap-1.5 text-sm">
                                    <Row
                                        l="Costo total (interno)"
                                        v={money(calc.summaryCost)}
                                    />
                                    <Row
                                        l="Subtotal"
                                        v={money(calc.subtotal)}
                                    />
                                    <Row l="IVA 16%" v={money(calc.tax)} />
                                    {calc.discountAmount > 0 && (
                                        <>
                                            <Row
                                                l="Total sin descuento"
                                                v={money(calc.totalBefore)}
                                            />
                                            <Row
                                                l="Descuento general"
                                                v={`-${money(calc.discountAmount)}`}
                                            />
                                        </>
                                    )}
                                    <Row
                                        l="TOTAL"
                                        v={money(calc.total)}
                                        strong
                                    />
                                    <Row
                                        l="Utilidad (después del descuento)"
                                        v={money(calc.profit)}
                                    />
                                    <Row
                                        l="Margen"
                                        v={formatPercent(calc.marginPercent)}
                                    />
                                    {showMxn && (
                                        <>
                                            <Row
                                                l="Subtotal (MXN)"
                                                v={mxn(calc.subtotal)}
                                            />
                                            <Row
                                                l="IVA (MXN)"
                                                v={mxn(calc.tax)}
                                            />
                                            <Row
                                                l="Total (MXN)"
                                                v={mxn(calc.total)}
                                                strong
                                            />
                                        </>
                                    )}
                                </dl>
                            </section>

                            {/* Plan de pagos */}
                            <section className={card}>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-[15px] font-semibold">
                                        Plan de pagos
                                    </h2>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={data.has_payment_plan}
                                            onChange={(e) =>
                                                setData(
                                                    'has_payment_plan',
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        Activar
                                    </label>
                                </div>

                                {data.has_payment_plan ? (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Tipo de anticipo">
                                            <select
                                                className={sel}
                                                value={data.first_payment_type}
                                                onChange={(e) =>
                                                    setData(
                                                        'first_payment_type',
                                                        e.target.value as
                                                            | 'percentage'
                                                            | 'fixed',
                                                    )
                                                }
                                            >
                                                <option value="percentage">
                                                    Porcentaje
                                                </option>
                                                <option value="fixed">
                                                    Monto fijo
                                                </option>
                                            </select>
                                        </Field>
                                        <Field
                                            label={
                                                data.first_payment_type ===
                                                'percentage'
                                                    ? 'Anticipo (%)'
                                                    : `Anticipo (${cur})`
                                            }
                                            error={err('first_payment_value')}
                                        >
                                            {num('first_payment_value', {
                                                min: 0,
                                            })}
                                        </Field>
                                        <Field
                                            label="Fecha del anticipo"
                                            error={err('first_payment_date')}
                                        >
                                            <Input
                                                type="date"
                                                value={data.first_payment_date}
                                                onChange={(e) =>
                                                    setData(
                                                        'first_payment_date',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                        <Field
                                            label="Mensualidades (1-120)"
                                            error={err('payment_months')}
                                        >
                                            {num('payment_months', {
                                                min: 1,
                                                max: 120,
                                                step: 1,
                                            })}
                                        </Field>
                                        <Field
                                            label="Términos del plan de pagos"
                                            className="sm:col-span-2"
                                        >
                                            <textarea
                                                rows={2}
                                                className={`${sel} h-auto py-2`}
                                                value={data.payment_terms}
                                                onChange={(e) =>
                                                    setData(
                                                        'payment_terms',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>

                                        {calc.downPaymentWarning && (
                                            <div className="flex gap-2 rounded-lg bg-amber-100 p-3 text-[13px] text-amber-800 sm:col-span-2 dark:bg-amber-950 dark:text-amber-300">
                                                <TriangleAlert className="size-4 shrink-0" />
                                                <span>
                                                    El pago inicial (
                                                    {money(calc.firstAmount)})
                                                    es MENOR que el costo de los
                                                    productos (
                                                    {money(calc.productsCost)}).
                                                    Con este anticipo podrías no
                                                    cubrir el costo de compra a
                                                    proveedor.
                                                </span>
                                            </div>
                                        )}

                                        <div className="sm:col-span-2">
                                            <table className="w-full text-[13px]">
                                                <thead>
                                                    <tr className="text-muted-foreground border-b text-left text-xs">
                                                        <th className="py-1.5">
                                                            Concepto
                                                        </th>
                                                        <th>Fecha</th>
                                                        <th className="text-right">
                                                            Pago
                                                        </th>
                                                        <th className="text-right">
                                                            Saldo
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {calc.schedule.map((r) => (
                                                        <tr
                                                            key={r.label}
                                                            className="border-b last:border-0"
                                                        >
                                                            <td className="py-1.5">
                                                                {r.label}
                                                            </td>
                                                            <td>
                                                                {r.date
                                                                    ? new Date(
                                                                          `${r.date}T00:00:00`,
                                                                      ).toLocaleDateString(
                                                                          'es-MX',
                                                                      )
                                                                    : '—'}
                                                            </td>
                                                            <td className="text-right">
                                                                {money(
                                                                    r.amount,
                                                                )}
                                                            </td>
                                                            <td className="text-right">
                                                                {money(
                                                                    r.balance,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                Todos los pagos incluyen IVA
                                                (16%). Es una proyección
                                                informativa, no registra cobros.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Activa el plan para repartir el total en
                                        un anticipo y mensualidades.
                                    </p>
                                )}
                            </section>
                        </div>
                    )}
                </div>

                <div className="flex justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={step === 0}
                        onClick={() => goTo(step - 1)}
                    >
                        <ChevronLeft /> Anterior
                    </Button>
                    <div className="flex gap-2">
                        {step < STEPS.length - 1 ? (
                            <Button
                                type="button"
                                onClick={() => goTo(step + 1)}
                            >
                                Siguiente <ChevronRight />
                            </Button>
                        ) : (
                            <Button type="submit" disabled={form.processing}>
                                <Save /> Guardar cotización
                            </Button>
                        )}
                    </div>
                </div>
            </form>

            {quote && emailOpen && (
                <QuoteEmailDialog
                    open
                    onClose={() => setEmailOpen(false)}
                    quote={{
                        id: quote.id,
                        number: quote.number,
                        name: quote.name,
                        due_date: quote.due_date ?? null,
                        client_data: quote.client_data ?? null,
                    }}
                    history={emails}
                />
            )}
            {dialog === 'client' && (
                <CatalogDialog<Client>
                    open
                    onClose={() => setDialog(null)}
                    title="Nuevo cliente"
                    fields={CLIENT_FIELDS}
                    initial={{ country: 'Mexico' }}
                    url="/cotizaciones/clientes"
                    method="POST"
                    onSaved={(c) => {
                        setClients([...clients, c]);
                        setData('client_id', String(c.id));
                    }}
                />
            )}
            {dialog === 'issuer-new' && (
                <CatalogDialog<Issuer>
                    open
                    onClose={() => setDialog(null)}
                    title="Nuevo emisor"
                    fields={ISSUER_FIELDS}
                    initial={{ country: 'México' }}
                    url="/cotizaciones/emisores"
                    method="POST"
                    onSaved={(i) => {
                        setIssuers([...issuers, i]);
                        setData('issuer_id', String(i.id));
                    }}
                />
            )}
            {dialog === 'issuer-edit' && selectedIssuer && (
                <CatalogDialog<Issuer>
                    open
                    onClose={() => setDialog(null)}
                    title="Editar emisor"
                    fields={ISSUER_FIELDS}
                    initial={toStr(selectedIssuer, ISSUER_FIELDS)}
                    url={`/cotizaciones/emisores/${selectedIssuer.id}`}
                    method="PUT"
                    onSaved={(i) =>
                        setIssuers(issuers.map((x) => (x.id === i.id ? i : x)))
                    }
                />
            )}
        </>
    );
}

function Calc({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
    return (
        <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{l}</span>
            <span className={bold ? 'font-semibold' : ''}>{v}</span>
        </div>
    );
}

function Row({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
    return (
        <div
            className={`flex justify-between ${strong ? 'border-t pt-1.5 text-base font-semibold' : ''}`}
        >
            <dt className={strong ? '' : 'text-muted-foreground'}>{l}</dt>
            <dd>{v}</dd>
        </div>
    );
}

QuoteForm.layout = {
    breadcrumbs: [
        { title: 'Cotizaciones', href: '/cotizaciones' },
        { title: 'Cotización', href: '#' },
    ],
};
