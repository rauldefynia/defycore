import { Head, Link, useForm } from '@inertiajs/react';
import { Dices, ShieldCheck, Save, UserRound } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';

type UserProp = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'admin' | 'seller';
    active: boolean;
    avatar: string | null;
    quotes_count?: number;
    opportunities_count?: number;
    clients_count?: number;
};

const card = 'bg-card rounded-xl border p-5 shadow-sm';

/** Contraseña aleatoria legible (sin caracteres ambiguos). */
function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint32Array(14));

    return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '-7';
}

const ROLE_INFO = {
    admin: {
        title: 'Administrador',
        icon: ShieldCheck,
        text: 'Acceso a todo el panel: usuarios, y las cotizaciones, clientes y oportunidades de todos los vendedores.',
    },
    seller: {
        title: 'Vendedor',
        icon: UserRound,
        text: 'Solo ve y administra sus propias cotizaciones, clientes y oportunidades.',
    },
} as const;

export default function UserForm({ user }: { user: UserProp | null }) {
    const getInitials = useInitials();
    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        role: (user?.role ?? 'seller') as 'admin' | 'seller',
        active: user?.active ?? true,
        password: '',
        password_confirmation: '',
    });
    const { data, setData, errors } = form;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (user) {
            form.put(`/usuarios/${user.id}`, {
                preserveScroll: true,
                onSuccess: () =>
                    form.reset('password', 'password_confirmation'),
            });
        } else {
            form.post('/usuarios');
        }
    };

    const fill = () => {
        const pwd = generatePassword();
        setData((d) => ({ ...d, password: pwd, password_confirmation: pwd }));
    };

    const field = (
        key: 'name' | 'email' | 'phone',
        label: string,
        opts: { required?: boolean; type?: string; className?: string } = {},
    ) => (
        <div className={`grid gap-1.5 ${opts.className ?? ''}`}>
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

    return (
        <>
            <Head title={user ? user.name : 'Nuevo usuario'} />
            <form
                onSubmit={submit}
                className="flex max-w-[960px] flex-col gap-5 px-6 pt-4 pb-11"
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        {user && (
                            <Avatar className="size-14 overflow-hidden rounded-full border">
                                <AvatarImage
                                    src={user.avatar ?? undefined}
                                    alt={user.name}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-accent text-primary font-semibold">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                        )}
                        <div>
                            <h1 className="text-[28px] font-semibold tracking-tight">
                                {user ? user.name : 'Nuevo usuario'}
                            </h1>
                            {user && (
                                <p className="text-muted-foreground text-[14.5px]">
                                    {user.quotes_count ?? 0} cotizaciones ·{' '}
                                    {user.opportunities_count ?? 0}{' '}
                                    oportunidades · {user.clients_count ?? 0}{' '}
                                    clientes
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" asChild>
                            <Link href="/usuarios">Volver</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            <Save /> Guardar
                        </Button>
                    </div>
                </div>

                <section className={card}>
                    <h2 className="mb-4 text-[15px] font-semibold">Datos</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {field('name', 'Nombre completo', { required: true })}
                        {field('email', 'Correo (inicio de sesión)', {
                            required: true,
                            type: 'email',
                        })}
                        {field('phone', 'Teléfono')}
                    </div>
                </section>

                <section className={card}>
                    <h2 className="mb-4 text-[15px] font-semibold">
                        Tipo de usuario
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        {(['admin', 'seller'] as const).map((r) => {
                            const info = ROLE_INFO[r];
                            const selected = data.role === r;

                            return (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setData('role', r)}
                                    className={`flex gap-3 rounded-xl border p-4 text-left transition ${selected ? 'border-primary bg-accent/50 ring-primary/30 ring-2' : 'hover:border-ring'}`}
                                >
                                    <span
                                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                                    >
                                        <info.icon className="size-5" />
                                    </span>
                                    <span>
                                        <span className="block text-[14px] font-semibold">
                                            {info.title}
                                        </span>
                                        <span className="text-muted-foreground block text-xs leading-snug">
                                            {info.text}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <InputError className="mt-2" message={errors.role} />

                    <label className="mt-5 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={data.active}
                            onChange={(e) =>
                                setData('active', e.target.checked)
                            }
                        />
                        <span>
                            Usuario activo{' '}
                            <span className="text-muted-foreground text-xs">
                                (si lo desactivas no podrá iniciar sesión)
                            </span>
                        </span>
                    </label>
                </section>

                <section className={card}>
                    <div className="mb-1 flex items-center justify-between">
                        <h2 className="text-[15px] font-semibold">
                            Contraseña
                        </h2>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={fill}
                        >
                            <Dices /> Generar
                        </Button>
                    </div>
                    <p className="text-muted-foreground mb-4 text-xs">
                        {user
                            ? 'Déjala vacía para conservar la actual.'
                            : 'Mínimo 8 caracteres. Compártela con el usuario por un medio seguro.'}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">
                                Contraseña{user ? '' : ' *'}
                            </Label>
                            <PasswordInput
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                            />
                            <InputError message={errors.password} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">
                                Confirmar contraseña
                            </Label>
                            <PasswordInput
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>
                </section>
            </form>
        </>
    );
}

UserForm.layout = {
    breadcrumbs: [
        { title: 'Usuarios', href: '/usuarios' },
        { title: 'Usuario', href: '#' },
    ],
};
