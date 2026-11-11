import { Head, Link, router } from '@inertiajs/react';
import { Mail, Pencil, Phone, Search, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { confirmAction } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ContactRow = {
    id: number;
    name: string;
    position: string | null;
    company: string | null;
    client: string | null;
    client_id: number | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    owner: string | null;
    opportunities_count: number;
    quotes_count: number;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

export default function ContactsIndex({
    contacts,
    filters,
    clients,
    isAdmin,
}: {
    contacts: Paginated<ContactRow>;
    filters: { search: string; client: string | null };
    clients: { id: number; name: string }[];
    isAdmin: boolean;
}) {
    const [search, setSearch] = useState(filters.search);
    const [client, setClient] = useState(filters.client ?? '');

    const apply = (next: { search?: string; client?: string }) =>
        router.get(
            '/contactos',
            {
                search: next.search ?? search,
                client: (next.client ?? client) || undefined,
            },
            { preserveState: true },
        );

    const remove = async (c: ContactRow) => {
        const extra =
            c.opportunities_count + c.quotes_count > 0
                ? 'Se desanexará de sus oportunidades; las cotizaciones conservan los datos con los que se emitieron.'
                : undefined;

        if (
            await confirmAction({
                title: `¿Eliminar el contacto ${c.name}?`,
                description: extra,
                confirmText: 'Eliminar',
            })
        ) {
            router.delete(`/contactos/${c.id}`);
        }
    };

    return (
        <>
            <Head title="Contactos" />
            <div className="flex max-w-[1320px] flex-col gap-5 px-6 pt-4 pb-11">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            Contactos
                        </h1>
                        <p className="text-muted-foreground text-[14.5px]">
                            {contacts.total} contactos · reutilízalos en
                            oportunidades y cotizaciones
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/contactos/nuevo">
                            <UserPlus /> Nuevo contacto
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({});
                        }}
                        className="flex max-w-md flex-1 gap-2"
                    >
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, puesto, empresa, correo o teléfono"
                        />
                        <Button type="submit" variant="outline">
                            <Search />
                        </Button>
                    </form>
                    <select
                        aria-label="Cliente"
                        className="border-input bg-background h-9 max-w-56 rounded-md border px-3 text-sm"
                        value={client}
                        onChange={(e) => {
                            setClient(e.target.value);
                            apply({ client: e.target.value });
                        }}
                    >
                        <option value="">Todos los clientes</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
                    <table className="w-full text-[13.5px]">
                        <thead>
                            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                                <th className="px-4 py-3">Contacto</th>
                                <th className="px-4 py-3">Empresa / cliente</th>
                                <th className="px-4 py-3">Medios</th>
                                {isAdmin && (
                                    <th className="px-4 py-3">Responsable</th>
                                )}
                                <th className="px-4 py-3 text-right">
                                    Oportunidades
                                </th>
                                <th className="px-4 py-3 text-right">
                                    Cotizaciones
                                </th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={isAdmin ? 7 : 6}
                                        className="text-muted-foreground px-4 py-10 text-center"
                                    >
                                        No hay contactos con ese filtro.
                                    </td>
                                </tr>
                            )}
                            {contacts.data.map((c) => (
                                <tr
                                    key={c.id}
                                    className="hover:bg-secondary border-b last:border-0"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-accent text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                                                {initials(c.name)}
                                            </span>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/contactos/${c.id}/editar`}
                                                    className="text-primary font-medium"
                                                >
                                                    {c.name}
                                                </Link>
                                                <div className="text-muted-foreground text-xs">
                                                    {c.position ?? '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            {c.client ?? c.company ?? '—'}
                                        </div>
                                        {c.client && c.company && (
                                            <div className="text-muted-foreground text-xs">
                                                {c.company}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {c.email && (
                                            <a
                                                href={`mailto:${c.email}`}
                                                className="hover:text-primary flex items-center gap-1.5 text-xs"
                                            >
                                                <Mail className="size-3.5" />
                                                {c.email}
                                            </a>
                                        )}
                                        {(c.phone || c.mobile) && (
                                            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                                                <Phone className="size-3.5" />
                                                {[c.phone, c.mobile]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </div>
                                        )}
                                        {!c.email &&
                                            !c.phone &&
                                            !c.mobile &&
                                            '—'}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-4 py-3">
                                            {c.owner ?? '—'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-right">
                                        {c.opportunities_count}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {c.quotes_count}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                title="Editar"
                                            >
                                                <Link
                                                    href={`/contactos/${c.id}/editar`}
                                                >
                                                    <Pencil />
                                                </Link>
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title="Eliminar"
                                                onClick={() => remove(c)}
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

                {contacts.links.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                        {contacts.links.map((l, i) => (
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
        </>
    );
}

ContactsIndex.layout = {
    breadcrumbs: [{ title: 'Contactos', href: '/contactos' }],
};
