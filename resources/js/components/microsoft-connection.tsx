import { router, usePage } from '@inertiajs/react';
import { CheckCircle2, Unlink } from 'lucide-react';
import { confirmAction } from '@/components/confirm-dialog';
import MicrosoftButton, { MicrosoftLogo } from '@/components/microsoft-button';
import { Button } from '@/components/ui/button';
import type { Auth } from '@/types';

/** Vincula o desconecta la cuenta Microsoft 365 del usuario (necesaria para enviar correos). */
export default function MicrosoftConnection() {
    const { auth, microsoftEnabled } = usePage<{
        auth: Auth;
        microsoftEnabled: boolean;
    }>().props;
    const user = auth.user;

    if (!microsoftEnabled) {
        return (
            <p className="text-muted-foreground text-sm">
                Microsoft 365 no está configurado en este sistema. Pide al
                administrador que defina las variables{' '}
                <code className="bg-secondary rounded px-1">MICROSOFT_*</code>.
            </p>
        );
    }

    return (
        <div className="bg-card flex flex-wrap items-center gap-4 rounded-xl border p-4">
            <span className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-lg">
                <MicrosoftLogo className="size-6" />
            </span>

            <div className="min-w-0 flex-1">
                {user.microsoft_connected ? (
                    <>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                            <CheckCircle2 className="size-4" /> Conectada
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                            {user.microsoft_email}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-sm font-medium">No conectada</div>
                        <div className="text-muted-foreground text-xs">
                            Conéctala para iniciar sesión con Microsoft y enviar
                            cotizaciones desde tu correo.
                        </div>
                    </>
                )}
            </div>

            {user.microsoft_connected ? (
                <Button
                    variant="outline"
                    onClick={async () => {
                        if (
                            await confirmAction({
                                title: '¿Desconectar tu cuenta de Microsoft 365?',
                                description:
                                    'Dejarás de poder enviar correos desde el sistema.',
                                confirmText: 'Desconectar',
                            })
                        ) {
                            router.delete('/auth/microsoft', {
                                preserveScroll: true,
                            });
                        }
                    }}
                >
                    <Unlink /> Desconectar
                </Button>
            ) : (
                <MicrosoftButton className="w-auto">
                    Conectar Microsoft 365
                </MicrosoftButton>
            )}
        </div>
    );
}
