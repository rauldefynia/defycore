import { Form, Head, Link } from '@inertiajs/react';
import { KeyRound, LogOut } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';

/** Cambio obligatorio de contraseña: primer inicio de sesión o contraseña vencida. */
export default function ForcePassword({
    reason,
}: {
    reason: 'first_login' | 'expired';
}) {
    return (
        <>
            <Head title="Cambiar contraseña" />

            <div className="bg-accent text-primary mb-5 flex items-start gap-3 rounded-xl p-3.5 text-[13px]">
                <KeyRound className="mt-0.5 size-4 shrink-0" />
                <p>
                    {reason === 'expired'
                        ? 'Tu contraseña venció. Crea una nueva para continuar.'
                        : 'Es tu primer acceso: reemplaza la contraseña temporal por una propia para continuar.'}
                </p>
            </div>

            <Form
                action="/cambiar-contrasena"
                method="put"
                resetOnSuccess
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">
                                Contraseña actual
                            </Label>
                            <PasswordInput
                                id="current_password"
                                name="current_password"
                                autoFocus
                                required
                                autoComplete="current-password"
                                className="h-11"
                            />
                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Nueva contraseña</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="new-password"
                                className="h-11"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirmar nueva contraseña
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                autoComplete="new-password"
                                className="h-11"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Guardar y continuar
                        </Button>

                        <Link
                            href={logout()}
                            as="button"
                            className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm"
                        >
                            <LogOut className="size-3.5" /> Cerrar sesión
                        </Link>
                    </>
                )}
            </Form>
        </>
    );
}

ForcePassword.layout = {
    title: 'Crea tu contraseña',
    description: 'Por seguridad, elige una contraseña que solo tú conozcas.',
};
