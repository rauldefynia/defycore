import { Head, Link, useForm } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, FilePlus, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ClientProp = {
    id: number;
    name: string;
    rfc: string;
    contact: string | null;
    email: string | null;
    phone: string | null;
    seller_id: number | null;
    seller_name: string | null;
    reference_contact: string | null;
    reference_email: string | null;
    reference_phone: string | null;
    address: string | null;
    zip: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    quotes_count?: number;
};

const card = 'bg-card rounded-xl border p-5 shadow-sm';
const RFC = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
    'Datos fiscales',
    'Contacto',
    'Vendedor y referencia',
    'Dirección',
];

/** Fase a la que pertenece cada campo (para saltar al error del servidor). */
const STEP_OF: Record<string, number> = {
    name: 0,
    rfc: 0,
    contact: 1,
    email: 1,
    phone: 1,
    seller_id: 2,
    reference_contact: 2,
    reference_email: 2,
    reference_phone: 2,
    address: 3,
    zip: 3,
    city: 3,
    state: 3,
    country: 3,
};

export default function ClientForm({
    client,
    isAdmin,
    sellers,
}: {
    client: ClientProp | null;
    isAdmin: boolean;
    sellers: { id: number; name: string }[];
}) {
    const [step, setStep] = useState(0);
    // 1 = avanza (entra desde la derecha), -1 = retrocede (entra desde la izquierda)
    const [dir, setDir] = useState<1 | -1>(1);

    const form = useForm({
        name: client?.name ?? '',
        rfc: client?.rfc ?? '',
        contact: client?.contact ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        // Vendedor: el administrador elige; un vendedor siempre queda como dueño.
        seller_id: client?.seller_id
            ? String(client.seller_id)
            : !isAdmin && sellers[0]
              ? String(sellers[0].id)
              : '',
        reference_contact: client?.reference_contact ?? '',
        reference_email: client?.reference_email ?? '',
        reference_phone: client?.reference_phone ?? '',
        address: client?.address ?? '',
        zip: client?.zip ?? '',
        city: client?.city ?? '',
        state: client?.state ?? '',
        country: client?.country ?? 'Mexico',
    });
    const { data, setData, errors } = form;

    const field = (
        key: keyof typeof data,
        label: string,
        opts: { required?: boolean; className?: string; type?: string } = {},
    ) => (
        <div className={`grid gap-1.5 ${opts.className ?? ''}`}>
            <Label className="text-[12.5px]">
                {label}
                {opts.required ? ' *' : ''}
            </Label>
            <Input
                type={opts.type ?? 'text'}
                value={data[key]}
                onChange={(e) =>
                    setData(
                        key,
                        key === 'rfc'
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                    )
                }
                maxLength={key === 'rfc' ? 13 : undefined}
            />
            <InputError message={errors[key]} />
        </div>
    );

    /** Valida una fase; marca los errores y devuelve si está completa. */
    const validateStep = (n: number): boolean => {
        form.clearErrors();
        const bad: Record<string, string> = {};

        if (n === 0) {
            if (!data.name.trim()) bad.name = 'El nombre es requerido.';

            if (!data.rfc.trim()) {
                bad.rfc = 'El RFC es requerido.';
            } else if (!RFC.test(data.rfc.trim().toUpperCase())) {
                bad.rfc = 'El RFC no tiene un formato válido.';
            }
        }

        if (n === 1 && data.email && !EMAIL.test(data.email)) {
            bad.email = 'Correo no válido.';
        }

        if (
            n === 2 &&
            data.reference_email &&
            !EMAIL.test(data.reference_email)
        ) {
            bad.reference_email = 'Correo no válido.';
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

    const submit = (e: React.FormEvent) => {
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

                if (first !== undefined) setStep(STEP_OF[first] ?? 0);

                toast.error('Revisa los campos marcados.');
            },
        };

        if (client) {
            form.put(`/clientes/${client.id}`, opts);
        } else {
            form.post('/clientes', opts);
        }
    };

    return (
        <>
            <Head title={client ? client.name : 'Nuevo cliente'} />
            <form
                onSubmit={submit}
                className="flex max-w-[960px] flex-col gap-5 px-6 pt-4 pb-11"
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            {client ? client.name : 'Nuevo cliente'}
                        </h1>
                        {client && (
                            <p className="text-muted-foreground text-[14.5px]">
                                {client.quotes_count ?? 0} cotizaciones
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {client && (
                            <Button type="button" variant="outline" asChild>
                                <Link href="/cotizaciones/nueva">
                                    <FilePlus /> Nueva cotización
                                </Link>
                            </Button>
                        )}
                        <Button type="button" variant="ghost" asChild>
                            <Link href="/clientes">Volver</Link>
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
                    <div className="text-muted-foreground max-w-48 truncate text-right text-sm">
                        {data.name || 'Sin nombre'}
                    </div>
                </nav>

                <div
                    key={step}
                    className={`animate-in fade-in flex flex-col gap-5 duration-400 motion-reduce:[--tw-enter-translate-x:0] ${dir > 0 ? 'slide-in-from-right-8' : 'slide-in-from-left-8'}`}
                >
                    {step === 0 && (
                        <section className={card}>
                            <h2 className="mb-4 text-[15px] font-semibold">
                                Datos fiscales
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {field('name', 'Nombre o razón social', {
                                    required: true,
                                })}
                                {field('rfc', 'RFC', { required: true })}
                            </div>
                        </section>
                    )}

                    {step === 1 && (
                        <section className={card}>
                            <h2 className="mb-4 text-[15px] font-semibold">
                                Contacto
                            </h2>
                            <div className="grid gap-4 md:grid-cols-3">
                                {field('contact', 'Persona de contacto')}
                                {field('email', 'Correo', { type: 'email' })}
                                {field('phone', 'Teléfono')}
                            </div>
                        </section>
                    )}

                    {step === 2 && (
                        <>
                            <section className={card}>
                                <h2 className="mb-4 text-[15px] font-semibold">
                                    Vendedor asignado
                                </h2>
                                <div className="grid gap-1.5 md:max-w-sm">
                                    <Label className="text-[12.5px]">
                                        Vendedor
                                    </Label>
                                    <select
                                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-60"
                                        disabled={!isAdmin}
                                        value={data.seller_id}
                                        onChange={(e) =>
                                            setData('seller_id', e.target.value)
                                        }
                                    >
                                        {isAdmin && (
                                            <option value="">
                                                — Sin asignar —
                                            </option>
                                        )}
                                        {sellers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.seller_id} />
                                    {!isAdmin && (
                                        <p className="text-muted-foreground text-xs">
                                            Los clientes que registras quedan
                                            asignados a ti.
                                        </p>
                                    )}
                                </div>
                            </section>

                            <section className={card}>
                                <h2 className="mb-1 text-[15px] font-semibold">
                                    Referencia
                                </h2>
                                <p className="text-muted-foreground mb-4 text-xs">
                                    Persona que refiere o contacto alterno del
                                    cliente.
                                </p>
                                <div className="grid gap-4 md:grid-cols-3">
                                    {field(
                                        'reference_contact',
                                        'Persona de referencia',
                                    )}
                                    {field('reference_email', 'Correo', {
                                        type: 'email',
                                    })}
                                    {field('reference_phone', 'Teléfono')}
                                </div>
                            </section>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <section className={card}>
                                <h2 className="mb-4 text-[15px] font-semibold">
                                    Dirección
                                </h2>
                                <div className="grid gap-4 md:grid-cols-4">
                                    {field('address', 'Calle y número', {
                                        className: 'md:col-span-3',
                                    })}
                                    {field('zip', 'C.P.')}
                                    {field('city', 'Ciudad')}
                                    {field('state', 'Estado')}
                                    {field('country', 'País', {
                                        className: 'md:col-span-2',
                                    })}
                                </div>
                            </section>
                            <p className="text-muted-foreground text-xs">
                                Al cotizar, los datos del cliente se copian a la
                                cotización; editar al cliente después no altera
                                cotizaciones ya emitidas.
                            </p>
                        </>
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
                    {step < STEPS.length - 1 ? (
                        <Button type="button" onClick={() => goTo(step + 1)}>
                            Siguiente <ChevronRight />
                        </Button>
                    ) : (
                        <Button type="submit" disabled={form.processing}>
                            <Save /> Guardar cliente
                        </Button>
                    )}
                </div>
            </form>
        </>
    );
}

ClientForm.layout = {
    breadcrumbs: [
        { title: 'Clientes', href: '/clientes' },
        { title: 'Cliente', href: '#' },
    ],
};
