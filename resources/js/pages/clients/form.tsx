import { Head, Link, useForm } from '@inertiajs/react';
import { FilePlus, Save } from 'lucide-react';
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
    address: string | null;
    zip: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    quotes_count?: number;
};

const card = 'bg-card rounded-xl border p-5 shadow-sm';

export default function ClientForm({ client }: { client: ClientProp | null }) {
    const form = useForm({
        name: client?.name ?? '',
        rfc: client?.rfc ?? '',
        contact: client?.contact ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (client) {
            form.put(`/clientes/${client.id}`, { preserveScroll: true });
        } else {
            form.post('/clientes');
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

                <section className={card}>
                    <h2 className="mb-4 text-[15px] font-semibold">Contacto</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        {field('contact', 'Persona de contacto')}
                        {field('email', 'Correo', { type: 'email' })}
                        {field('phone', 'Teléfono')}
                    </div>
                </section>

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
                    Al cotizar, los datos del cliente se copian a la cotización;
                    editar al cliente después no altera cotizaciones ya
                    emitidas.
                </p>
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
