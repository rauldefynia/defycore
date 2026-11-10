import { Form, Head, Link, usePage } from '@inertiajs/react';
import { Check, MailWarning, Save } from 'lucide-react';
import type { ReactNode } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AvatarUploader from '@/components/avatar-uploader';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import MicrosoftConnection from '@/components/microsoft-connection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

const ROLES = { admin: 'Administrador', seller: 'Vendedor' } as const;

function Card({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="bg-card rounded-xl border p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <p className="text-muted-foreground mb-4 text-sm">{description}</p>
            {children}
        </section>
    );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium">{children}</dd>
        </div>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth.user;
    const unverified = mustVerifyEmail && user.email_verified_at === null;
    const since = new Date(user.created_at).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
    });

    return (
        <>
            <Head title="Perfil" />

            <h1 className="sr-only">Configuración del perfil</h1>

            <Card
                title="Tu cuenta"
                description="Tu foto se muestra en el panel junto a tu nombre."
            >
                <AvatarUploader />
                <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
                    <Fact label="Tipo de usuario">
                        {ROLES[user.role] ?? user.role}
                    </Fact>
                    <Fact label="Miembro desde">
                        <span className="capitalize">{since}</span>
                    </Fact>
                    <Fact label="Correo">
                        {unverified ? (
                            <span className="text-amber-600 dark:text-amber-400">
                                Sin verificar
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Check className="size-3.5" /> Verificado
                            </span>
                        )}
                    </Fact>
                </dl>
            </Card>

            <Card
                title="Información personal"
                description="Actualiza tu nombre y tu correo de acceso."
            >
                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-5"
                >
                    {({ processing, errors, isDirty, recentlySuccessful }) => (
                        <>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="name">
                                        Nombre completo
                                    </Label>
                                    <Input
                                        id="name"
                                        defaultValue={user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Tu nombre"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="email">
                                        Correo electrónico
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        defaultValue={user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="correo@empresa.mx"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>

                            {unverified && (
                                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-200/20 dark:bg-amber-500/10 dark:text-amber-200">
                                    <MailWarning className="mt-0.5 size-4 shrink-0" />
                                    <div>
                                        Tu correo no está verificado.{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="font-medium underline underline-offset-4"
                                        >
                                            Reenviar correo de verificación
                                        </Link>
                                        {status === 'verification-link-sent' && (
                                            <p className="mt-1 font-medium text-green-700 dark:text-green-400">
                                                Enviamos un nuevo enlace de
                                                verificación a tu correo.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 border-t pt-4">
                                <span
                                    aria-live="polite"
                                    className={`text-sm transition-opacity ${recentlySuccessful ? 'text-green-600 opacity-100 dark:text-green-400' : isDirty ? 'text-muted-foreground opacity-100' : 'opacity-0'}`}
                                >
                                    {recentlySuccessful
                                        ? 'Cambios guardados'
                                        : 'Tienes cambios sin guardar'}
                                </span>
                                <Button
                                    disabled={processing || !isDirty}
                                    data-test="update-profile-button"
                                >
                                    <Save /> Guardar cambios
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Card>

            <Card
                title="Microsoft 365"
                description="Inicia sesión con tu cuenta de la empresa y envía cotizaciones desde tu correo."
            >
                <MicrosoftConnection />
            </Card>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Perfil', href: edit() }],
};
