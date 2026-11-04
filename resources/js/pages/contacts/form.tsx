import { Head, Link, useForm } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ContactProp = {
    id: number;
    name: string;
    position: string | null;
    company: string | null;
    client_id: number | null;
    owner_id: number;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    notes: string | null;
    opportunities_count?: number;
    quotes_count?: number;
};

const card = 'bg-card rounded-xl border p-5 shadow-sm';
const sel =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
    'Datos de la persona',
    'Medios de contacto',
    'Notas y responsable',
];

/** Fase a la que pertenece cada campo (para saltar al error del servidor). */
const STEP_OF: Record<string, number> = {
    name: 0,
    position: 0,
    company: 0,
    client_id: 0,
    email: 1,
    phone: 1,
    mobile: 1,
    notes: 2,
    owner_id: 2,
};

export default function ContactForm({
    contact,
    defaults,
    isAdmin,
    clients,
    owners,
}: {
    contact: ContactProp | null;
    defaults: { client_id: number | null } | null;
    isAdmin: boolean;
    clients: { id: number; name: string }[];
    owners: { id: number; name: string }[];
}) {
    const [step, setStep] = useState(0);
    // 1 = avanza (entra desde la derecha), -1 = retrocede (entra desde la izquierda)
    const [dir, setDir] = useState<1 | -1>(1);

    const form = useForm({
        name: contact?.name ?? '',
        position: contact?.position ?? '',
        company: contact?.company ?? '',
        client_id: contact?.client_id
            ? String(contact.client_id)
            : defaults?.client_id
              ? String(defaults.client_id)
              : '',
        email: contact?.email ?? '',
        phone: contact?.phone ?? '',
        mobile: contact?.mobile ?? '',
        notes: contact?.notes ?? '',
        owner_id: String(contact?.owner_id ?? owners[0]?.id ?? ''),
    });
    const { data, setData, errors } = form;

    const text = (
        key: 'name' | 'position' | 'company' | 'email' | 'phone' | 'mobile',
        label: string,
        opts: { required?: boolean; type?: string } = {},
    ) => (
        <div className="grid gap-1.5">
            <Label className="text-[12.5px]">
                {label}
                {opts.required ? ' *' : ''}
            </Label>
            <Input
                type={opts.type ?? 'text'}
                value={data[key]}
                onChange={(e) => setData(key, e.target.value)}
            />
            <InputError message={errors[key]} />
        </div>
    );

    /** Valida una fase; marca los errores y devuelve si está completa. */
    const validateStep = (n: number): boolean => {
        form.clearErrors();
        const bad: Record<string, string> = {};

        if (n === 0 && !data.name.trim()) {
            bad.name = 'El nombre es requerido.';
        }

        if (n === 1 && data.email && !EMAIL.test(data.email)) {
            bad.email = 'Correo no válido.';
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

        if (contact) {
            form.put(`/contactos/${contact.id}`, opts);
        } else {
            form.post('/contactos', opts);
        }
    };

    return (
        <>
            <Head title={contact ? contact.name : 'Nuevo contacto'} />
            <form
                onSubmit={submit}
                className="flex max-w-[960px] flex-col gap-5 px-6 pt-4 pb-11"
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            {contact ? contact.name : 'Nuevo contacto'}
                        </h1>
                        {contact && (
                            <p className="text-muted-foreground text-[14.5px]">
                                En {contact.opportunities_count ?? 0}{' '}
                                oportunidades · {contact.quotes_count ?? 0}{' '}
                                cotizaciones
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" asChild>
                            <Link href="/contactos">Volver</Link>
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
                                Datos de la persona
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {text('name', 'Nombre completo', {
                                    required: true,
                                })}
                                {text('position', 'Puesto / cargo')}
                                <div className="grid gap-1.5">
                                    <Label className="text-[12.5px]">
                                        Cliente al que pertenece
                                    </Label>
                                    <select
                                        className={sel}
                                        value={data.client_id}
                                        onChange={(e) =>
                                            setData('client_id', e.target.value)
                                        }
                                    >
                                        <option value="">— Ninguno —</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.client_id} />
                                </div>
                                {text(
                                    'company',
                                    'Empresa (si no es un cliente registrado)',
                                )}
                            </div>
                        </section>
                    )}

                    {step === 1 && (
                        <section className={card}>
                            <h2 className="mb-4 text-[15px] font-semibold">
                                Medios de contacto
                            </h2>
                            <div className="grid gap-4 md:grid-cols-3">
                                {text('email', 'Correo electrónico', {
                                    type: 'email',
                                })}
                                {text('phone', 'Teléfono')}
                                {text('mobile', 'Celular')}
                            </div>
                        </section>
                    )}

                    {step === 2 && (
                        <>
                            <section className={card}>
                                <h2 className="mb-4 text-[15px] font-semibold">
                                    Notas
                                </h2>
                                <textarea
                                    rows={5}
                                    maxLength={2000}
                                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                                    placeholder="Preferencias, horarios, cómo se conoció…"
                                    value={data.notes}
                                    onChange={(e) =>
                                        setData('notes', e.target.value)
                                    }
                                />
                                <InputError message={errors.notes} />
                            </section>

                            <section className={card}>
                                <h2 className="mb-4 text-[15px] font-semibold">
                                    Responsable
                                </h2>
                                <div className="grid gap-1.5 md:max-w-sm">
                                    <Label className="text-[12.5px]">
                                        Vendedor
                                    </Label>
                                    <select
                                        className={`${sel} disabled:opacity-60`}
                                        disabled={!isAdmin}
                                        value={data.owner_id}
                                        onChange={(e) =>
                                            setData('owner_id', e.target.value)
                                        }
                                    >
                                        {owners.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.owner_id} />
                                    {!isAdmin && (
                                        <p className="text-muted-foreground text-xs">
                                            Los contactos que registras quedan
                                            asignados a ti.
                                        </p>
                                    )}
                                </div>
                            </section>
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
                            <Save /> Guardar contacto
                        </Button>
                    )}
                </div>
            </form>
        </>
    );
}

ContactForm.layout = {
    breadcrumbs: [
        { title: 'Contactos', href: '/contactos' },
        { title: 'Contacto', href: '#' },
    ],
};
