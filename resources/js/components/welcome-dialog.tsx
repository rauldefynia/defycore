import { router, usePage } from '@inertiajs/react';
import {
    BookUser,
    FileText,
    Kanban,
    Mail,
    ScrollText,
    ShieldCheck,
    Sparkles,
    UserCircle,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { START_TOUR_EVENT } from '@/components/app-tour';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Auth } from '@/types';

type Feature = {
    icon: ComponentType<{ className?: string }>;
    title: string;
    text: string;
};

const SELLER: Feature[] = [
    {
        icon: Users,
        title: 'Clientes',
        text: 'Da de alta a tus clientes con sus datos de contacto y fiscales; quedan disponibles al cotizar.',
    },
    {
        icon: BookUser,
        title: 'Contactos',
        text: 'Guarda a las personas con las que tratas y reutilízalas en oportunidades y cotizaciones.',
    },
    {
        icon: FileText,
        title: 'Cotizaciones',
        text: 'Arma cotizaciones por fases con cálculo de márgenes, IVA y pagos, y descarga el PDF para tu cliente.',
    },
    {
        icon: Mail,
        title: 'Envío por correo',
        text: 'Conecta tu cuenta de Microsoft 365 en tu perfil y envía cotizaciones desde tu propio buzón.',
    },
    {
        icon: Kanban,
        title: 'Oportunidades',
        text: 'Arrastra tus oportunidades por el pipeline hasta ganarlas, y anexa una o varias cotizaciones.',
    },
    {
        icon: UserCircle,
        title: 'Tu perfil',
        text: 'Sube tu foto y cambia tu contraseña desde Configuración. Verás solo tu propia información.',
    },
];

const ADMIN: Feature[] = [
    {
        icon: ShieldCheck,
        title: 'Usuarios',
        text: 'Crea y administra usuarios, asigna el tipo (administrador o vendedor) y activa o desactiva accesos.',
    },
    {
        icon: ScrollText,
        title: 'Bitácora',
        text: 'Consulta quién dio de alta, modificó o eliminó cada registro, y los accesos al sistema.',
    },
    {
        icon: Users,
        title: 'Clientes, cotizaciones y oportunidades',
        text: 'Tienes acceso a la información de todos los vendedores, incluido el PDF interno con costos y utilidad.',
    },
    {
        icon: Mail,
        title: 'Microsoft 365',
        text: 'Inicia sesión con tu cuenta corporativa y envía cotizaciones por correo desde tu perfil.',
    },
];

/** Bienvenida de primer inicio de sesión: se muestra una vez y luego no vuelve a aparecer. */
export function WelcomeDialog() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth.user;
    const [open, setOpen] = useState(!!user && !user.welcomed_at);

    if (!user) {
        return null;
    }

    const isAdmin = user.role === 'admin';
    const features = isAdmin ? ADMIN : SELLER;

    const dismiss = (startTour = false) => {
        setOpen(false);
        if (startTour) {
            // Espera a que cierre el diálogo para que el recorrido mida bien el menú.
            setTimeout(
                () => window.dispatchEvent(new Event(START_TOUR_EVENT)),
                250,
            );
        }
        router.post(
            '/bienvenida',
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <div className="bg-primary/10 text-primary mb-1 flex size-11 items-center justify-center rounded-full">
                        <Sparkles className="size-5" />
                    </div>
                    <DialogTitle className="text-xl">
                        ¡Bienvenido a Defynia, {user.name.split(' ')[0]}!
                    </DialogTitle>
                    <DialogDescription>
                        {isAdmin
                            ? 'Tu acceso es de administrador: ves y gestionas todo el panel. Esto es lo que puedes hacer:'
                            : 'Tu acceso es de vendedor: trabajas con tus propios clientes, cotizaciones y oportunidades. Esto es lo que puedes hacer:'}
                    </DialogDescription>
                </DialogHeader>

                <ul className="grid gap-3">
                    {features.map((f) => (
                        <li key={f.title} className="flex gap-3">
                            <span className="bg-secondary text-secondary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <f.icon className="size-4" />
                            </span>
                            <span className="text-[13.5px] leading-snug">
                                <strong className="block text-sm">
                                    {f.title}
                                </strong>
                                <span className="text-muted-foreground">
                                    {f.text}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>

                <DialogFooter>
                    <Button variant="outline" onClick={() => dismiss()}>
                        Omitir
                    </Button>
                    <Button onClick={() => dismiss(true)}>
                        Iniciar tutorial
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
