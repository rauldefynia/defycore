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
    must_change_password?: boolean;
    password_expiry_days?: number | null;
    password_expires_at?: string | null;
    password_expired?: boolean;
};

const card = 'bg-card rounded-xl border p-5 shadow-sm';

/** Interruptor accesible (activar / desactivar). */
function Toggle({
    checked,
    onChange,
    title,
    text,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    title: string;
    text: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            data-sound="toggle"
            onClick={() => onChange(!checked)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${checked ? 'border-primary bg-accent/60' : 'hover:bg-accent/40'}`}
        >
            <span
                className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
                />
            </span>
            <span>
                <span className="block text-[13.5px] font-semibold">
                    {title}
                </span>
                <span className="text-muted-foreground block text-xs leading-snug">
                    {text}
                </span>
            </span>
        </button>
    );
}

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
        change_password: !user,
        admin_password: '',
        password: '',
        password_confirmation: '',
        must_change_password: user?.must_change_password ?? true,
        password_expires: !!user?.password_expiry_days,
        password_expiry_days: String(user?.password_expiry_days ?? 90),
    });
    const { data, setData, errors } = form;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (user) {
            form.put(`/usuarios/${user.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset(
                        'password',
                        'password_confirmation',
                        'admin_password',
                    );
                    // vuelve a contraer la sección
                    setData('change_password', false);
                },
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

                    <div className="mt-5">
                        <Toggle
                            checked={data.active}
                            onChange={(v) => setData('active', v)}
                            title={data.active ? 'Usuario activo' : 'Usuario inactivo'}
                            text="Si lo desactivas no podrá iniciar sesión."
                        />
                    </div>
                </section>

                <section className={card}>
                    <div className="mb-1 flex items-center justify-between">
                        <h2 className="text-[15px] font-semibold">
                            Contraseña
                        </h2>
                        {data.change_password && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={fill}
                            >
                                <Dices /> Generar
                            </Button>
                        )}
                    </div>

                    {user ? (
                        <Toggle
                            checked={data.change_password}
                            onChange={(v) =>
                                setData((d) => ({
                                    ...d,
                                    change_password: v,
                                    ...(v
                                        ? {}
                                        : {
                                              password: '',
                                              password_confirmation: '',
                                              admin_password: '',
                                          }),
                                }))
                            }
                            title="Modificar contraseña"
                            text="Actívalo para asignarle una nueva contraseña y editar su política. Por seguridad se pedirá tu contraseña de administrador."
                        />
                    ) : (
                        <p className="text-muted-foreground mb-4 text-xs">
                            Mínimo 8 caracteres. Compártela con el usuario por
                            un medio seguro.
                        </p>
                    )}

                    {data.change_password && (
                        <div className="animate-in fade-in slide-in-from-top-2 mt-4 duration-300">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label className="text-[12.5px]">
                                        Nueva contraseña *
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
                                {user && (
                                    <div className="grid gap-1.5 md:col-span-2 md:max-w-[calc(50%-0.5rem)]">
                                        <Label className="text-[12.5px]">
                                            Tu contraseña (administrador) *
                                        </Label>
                                        <PasswordInput
                                            autoComplete="current-password"
                                            value={data.admin_password}
                                            onChange={(e) =>
                                                setData(
                                                    'admin_password',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={errors.admin_password}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 grid gap-3 border-t pt-5">
                                <h3 className="text-[13.5px] font-semibold">
                                    Política de la contraseña
                                </h3>

                                <Toggle
                                    checked={data.must_change_password}
                                    onChange={(v) =>
                                        setData('must_change_password', v)
                                    }
                                    title="Debe cambiarla en su primer inicio de sesión"
                                    text="Al entrar con esta contraseña, el sistema le pedirá crear una propia antes de usar el panel."
                                />

                                <Toggle
                                    checked={data.password_expires}
                                    onChange={(v) =>
                                        setData('password_expires', v)
                                    }
                                    title="La contraseña expira"
                                    text="Pasado el plazo, tendrá que cambiarla al iniciar sesión para poder continuar."
                                />

                                {data.password_expires && (
                                    <div className="animate-in fade-in slide-in-from-top-2 grid gap-1.5 pl-1 duration-300 sm:max-w-xs">
                                        <Label className="text-[12.5px]">
                                            Vigencia (días)
                                        </Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={data.password_expiry_days}
                                            onChange={(e) =>
                                                setData(
                                                    'password_expiry_days',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={errors.password_expiry_days}
                                        />
                                        {user?.password_expires_at && (
                                            <p
                                                className={`text-xs ${user.password_expired ? 'text-destructive' : 'text-muted-foreground'}`}
                                            >
                                                {user.password_expired
                                                    ? 'La contraseña actual ya expiró el '
                                                    : 'La contraseña actual vence el '}
                                                {user.password_expires_at}.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
