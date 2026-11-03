import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInitials } from '@/hooks/use-initials';
import type { Auth } from '@/types';

type UserRow = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'admin' | 'seller';
    active: boolean;
    avatar: string | null;
    quotes_count: number;
    opportunities_count: number;
    clients_count: number;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

export default function UsersIndex({
    users,
    filters,
    roles,
}: {
    users: Paginated<UserRow>;
    filters: { search: string; role: string | null };
    roles: { key: string; label: string }[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const getInitials = useInitials();
    const [search, setSearch] = useState(filters.search);
    const [role, setRole] = useState(filters.role ?? '');

    const apply = (next: { search?: string; role?: string }) =>
        router.get(
            '/usuarios',
            {
                search: next.search ?? search,
                role: (next.role ?? role) || undefined,
            },
            { preserveState: true },
        );

    const remove = (u: UserRow) => {
        if (confirm(`¿Eliminar al usuario ${u.name}?`)) {
            router.delete(`/usuarios/${u.id}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Usuarios" />
            <div className="flex max-w-[1320px] flex-col gap-5 px-6 pt-4 pb-11">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight">
                            Usuarios
                        </h1>
                        <p className="text-muted-foreground text-[14.5px]">
                            {users.total} usuarios · administra accesos y tipos
                            de usuario
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/usuarios/nuevo">
                            <UserPlus /> Nuevo usuario
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
                            placeholder="Buscar por nombre o correo"
                        />
                        <Button type="submit" variant="outline">
                            <Search />
                        </Button>
                    </form>
                    <select
                        aria-label="Tipo de usuario"
                        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                        value={role}
                        onChange={(e) => {
                            setRole(e.target.value);
                            apply({ role: e.target.value });
                        }}
                    >
                        <option value="">Todos los tipos</option>
                        {roles.map((r) => (
                            <option key={r.key} value={r.key}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-card overflow-x-auto rounded-xl border shadow-sm">
                    <table className="w-full text-[13.5px]">
                        <thead>
                            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">
                                    Cotizaciones
                                </th>
                                <th className="px-4 py-3 text-right">
                                    Oportunidades
                                </th>
                                <th className="px-4 py-3 text-right">
                                    Clientes
                                </th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-muted-foreground px-4 py-10 text-center"
                                    >
                                        No hay usuarios con ese filtro.
                                    </td>
                                </tr>
                            )}
                            {users.data.map((u) => {
                                const isMe = u.id === auth.user.id;

                                return (
                                    <tr
                                        key={u.id}
                                        className={`hover:bg-secondary border-b last:border-0 ${u.active ? '' : 'opacity-60'}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-9 overflow-hidden rounded-full">
                                                    <AvatarImage
                                                        src={
                                                            u.avatar ??
                                                            undefined
                                                        }
                                                        alt={u.name}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback className="bg-accent text-primary text-xs font-semibold">
                                                        {getInitials(u.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/usuarios/${u.id}/editar`}
                                                        className="text-primary font-medium"
                                                    >
                                                        {u.name}
                                                    </Link>
                                                    {isMe && (
                                                        <span className="text-muted-foreground ml-1.5 text-xs">
                                                            (tú)
                                                        </span>
                                                    )}
                                                    <div className="text-muted-foreground truncate text-xs">
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    u.role === 'admin'
                                                        ? 'bg-accent text-primary'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                                }`}
                                            >
                                                {u.role === 'admin'
                                                    ? 'Administrador'
                                                    : 'Vendedor'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
                                            >
                                                <span
                                                    className={`size-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-muted-foreground'}`}
                                                />
                                                {u.active
                                                    ? 'Activo'
                                                    : 'Desactivado'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {u.quotes_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {u.opportunities_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {u.clients_count}
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
                                                        href={`/usuarios/${u.id}/editar`}
                                                    >
                                                        <Pencil />
                                                    </Link>
                                                </Button>
                                                {!isMe && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        title="Eliminar"
                                                        onClick={() =>
                                                            remove(u)
                                                        }
                                                    >
                                                        <Trash2 className="text-red-600" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {users.links.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                        {users.links.map((l, i) => (
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

UsersIndex.layout = {
    breadcrumbs: [{ title: 'Usuarios', href: '/usuarios' }],
};
