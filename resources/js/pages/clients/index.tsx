import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ClientRow = {
    id: number;
    name: string;
    rfc: string;
    contact: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    quotes_count: number;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

export default function ClientsIndex({
    clients,
    filters,
}: {
    clients: Paginated<ClientRow>;
    filters: { search: string };
}) {
    const [search, setSearch] = useState(filters.search);

    const doSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/clientes', { search }, { preserveState: true });
    };

    const remove = (c: ClientRow) => {
        const extra =
            c.quotes_count > 0
                ? `\n\nSus ${c.quotes_count} cotizaciones conservarán los datos con los que se emitieron.`
                : '';

        if (confirm(`¿Eliminar al cliente ${c.name}?${extra}`)) {
            router.delete(`/clientes/${c.id}`);
        }
    };

    return (
        <>
            <Head title="Clientes" />
            <div className="flex max-w-[1320px] flex-col gap-5 px-6 pt-4 pb-11">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            Clientes
                        </h1>
                        <p className="text-muted-foreground text-[14.5px]">
                            {clients.total} clientes · disponibles al crear
                            cotizaciones
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/clientes/nuevo">
                            <UserPlus /> Nuevo cliente
                        </Link>
                    </Button>
                </div>

                <form onSubmit={doSearch} className="flex max-w-md gap-2">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, RFC, contacto o correo"
                    />
                    <Button type="submit" variant="outline">
                        <Search />
                    </Button>
                </form>

                <div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
                    <table className="w-full text-[13.5px]">
                        <thead>
                            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">RFC</th>
                                <th className="px-4 py-3">Contacto</th>
                                <th className="px-4 py-3">Ubicación</th>
                                <th className="px-4 py-3 text-right">
                                    Cotizaciones
                                </th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {clients.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="text-muted-foreground px-4 py-10 text-center"
                                    >
                                        No hay clientes todavía.
                                    </td>
                                </tr>
                            )}
                            {clients.data.map((c) => (
                                <tr
                                    key={c.id}
                                    className="hover:bg-secondary border-b last:border-0"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            href={`/clientes/${c.id}/editar`}
                                            className="text-primary"
                                        >
                                            {c.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">{c.rfc}</td>
                                    <td className="px-4 py-3">
                                        <div>{c.contact ?? '—'}</div>
                                        <div className="text-muted-foreground text-xs">
                                            {[c.email, c.phone]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {[c.city, c.state]
                                            .filter(Boolean)
                                            .join(', ') || '—'}
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
                                                    href={`/clientes/${c.id}/editar`}
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

                {clients.links.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                        {clients.links.map((l, i) => (
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

ClientsIndex.layout = {
    breadcrumbs: [{ title: 'Clientes', href: '/clientes' }],
};
