import { usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Auth } from '@/types';

export const START_TOUR_EVENT = 'defynia:start-tour';

type Step = {
    /** Valor del atributo data-tour del elemento a resaltar; sin él, tarjeta centrada. */
    target?: string;
    title: string;
    text: string;
};

const INTRO: Step = {
    title: 'Tutorial del panel',
    text: 'Te mostramos en un minuto dónde está cada función. Puedes salir cuando quieras y repetirlo desde el botón de ayuda (?) de la barra superior.',
};

const OUTRO: Step = {
    title: '¡Listo para empezar!',
    text: 'Tu foto, contraseña y conexión con Microsoft 365 se configuran desde el menú de tu usuario, abajo a la izquierda, en Configuración.',
};

const SELLER_STEPS: Step[] = [
    {
        target: '/dashboard',
        title: 'Inicio',
        text: 'Tu resumen: cotizaciones, oportunidades y clientes a un vistazo, con accesos rápidos para crear.',
    },
    {
        target: '/clientes',
        title: 'Clientes',
        text: 'Registra aquí a tus clientes. Una vez dados de alta, los eliges al cotizar sin volver a capturar sus datos.',
    },
    {
        target: '/contactos',
        title: 'Contactos',
        text: 'Directorio de personas (no necesitan ser usuarios). Regístralas una vez y reutilízalas como contacto de oportunidades y de cotizaciones.',
    },
    {
        target: '/cotizaciones',
        title: 'Cotizaciones',
        text: 'Crea cotizaciones por fases, descarga el PDF para tu cliente y envíalo por correo desde tu cuenta de Microsoft 365.',
    },
    {
        target: '/oportunidades',
        title: 'Oportunidades',
        text: 'Tu pipeline de ventas: arrastra cada oportunidad entre etapas hasta ganarla y anexa las cotizaciones relacionadas.',
    },
];

const ADMIN_STEPS: Step[] = [
    SELLER_STEPS[0],
    {
        target: '/usuarios',
        title: 'Usuarios',
        text: 'Da de alta usuarios, define si son administradores o vendedores y activa o desactiva su acceso.',
    },
    {
        target: '/bitacora',
        title: 'Bitácora',
        text: 'Auditoría de todo lo que se da de alta, modifica o elimina, y de los accesos. Filtra por usuario, módulo o fecha.',
    },
    ...SELLER_STEPS.slice(1).map((s) => ({
        ...s,
        text: `${s.text} Como administrador ves la información de todos los vendedores.`,
    })),
];

const PAD = 6;
const CARD_W = 340;

type Rect = { top: number; left: number; width: number; height: number };

/** Recorrido guiado: resalta las opciones del menú lateral una por una. */
export function AppTour() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isAdmin = auth.user?.role === 'admin';
    const steps = [INTRO, ...(isAdmin ? ADMIN_STEPS : SELLER_STEPS), OUTRO];

    const [active, setActive] = useState(false);
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);

    const step = steps[index];
    const last = index === steps.length - 1;

    useEffect(() => {
        const start = () => {
            setIndex(0);
            setActive(true);
        };
        window.addEventListener(START_TOUR_EVENT, start);

        return () => window.removeEventListener(START_TOUR_EVENT, start);
    }, []);

    const measure = useCallback(() => {
        const el = step.target
            ? document.querySelector<HTMLElement>(
                  `[data-tour="${step.target}"]`,
              )
            : null;
        const box = el?.getBoundingClientRect();

        // Elemento oculto (p. ej. menú colapsado en móvil): se muestra la tarjeta centrada.
        setRect(
            box && box.width > 0 && box.height > 0
                ? {
                      top: box.top,
                      left: box.left,
                      width: box.width,
                      height: box.height,
                  }
                : null,
        );
    }, [step.target]);

    useLayoutEffect(() => {
        if (!active) {
            return;
        }

        measure();
        window.addEventListener('resize', measure);

        return () => window.removeEventListener('resize', measure);
    }, [active, measure]);

    useEffect(() => {
        if (!active) {
            return;
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActive(false);
            } else if (e.key === 'ArrowRight') {
                setIndex((i) => Math.min(i + 1, steps.length - 1));
            } else if (e.key === 'ArrowLeft') {
                setIndex((i) => Math.max(i - 1, 0));
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [active, steps.length]);

    if (!active) {
        return null;
    }

    const cardStyle: React.CSSProperties = rect
        ? {
              top: Math.min(
                  Math.max(12, rect.top + rect.height / 2 - 80),
                  window.innerHeight - 240,
              ),
              left: Math.min(
                  rect.left + rect.width + PAD + 14,
                  window.innerWidth - CARD_W - 12,
              ),
              width: CARD_W,
          }
        : {
              top: '50%',
              left: '50%',
              width: CARD_W + 40,
              maxWidth: 'calc(100vw - 24px)',
              transform: 'translate(-50%, -50%)',
          };

    return (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
            {/* Capa que bloquea clics; el foco se resalta con una sombra gigante */}
            <div
                className="absolute inset-0"
                onClick={() => setActive(false)}
                style={rect ? undefined : { background: 'rgba(0,0,0,0.6)' }}
            />
            {rect && (
                <div
                    className="pointer-events-none absolute rounded-lg ring-2 ring-white/80 transition-all duration-300"
                    style={{
                        top: rect.top - PAD,
                        left: rect.left - PAD,
                        width: rect.width + PAD * 2,
                        height: rect.height + PAD * 2,
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                    }}
                />
            )}

            <div
                key={index}
                className="bg-card text-card-foreground animate-in fade-in-0 zoom-in-95 absolute rounded-xl border p-5 shadow-2xl duration-200"
                style={cardStyle}
            >
                <button
                    type="button"
                    aria-label="Cerrar tutorial"
                    onClick={() => setActive(false)}
                    className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
                >
                    <X className="size-4" />
                </button>
                <div className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
                    Paso {index + 1} de {steps.length}
                </div>
                <h3 className="mb-1.5 pr-5 text-base font-semibold">
                    {step.title}
                </h3>
                <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                    {step.text}
                </p>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-1">
                        {steps.map((_, i) => (
                            <span
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${i === index ? 'bg-primary w-4' : 'bg-border w-1.5'}`}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {index > 0 ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIndex(index - 1)}
                            >
                                <ChevronLeft /> Atrás
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActive(false)}
                            >
                                Omitir
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={() =>
                                last ? setActive(false) : setIndex(index + 1)
                            }
                        >
                            {last ? 'Finalizar' : 'Siguiente'}
                            {!last && <ChevronRight />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
