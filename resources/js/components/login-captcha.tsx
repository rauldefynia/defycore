import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';

type Challenge = {
    image: string;
    options: { id: string; label: string }[];
};

/**
 * Captcha propio: el servidor entrega la pregunta como imagen y opciones; la
 * respuesta correcta nunca llega al navegador. Cambia `refreshKey` para pedir otro reto
 * (cada reto sirve para un solo intento).
 */
export default function LoginCaptcha({
    error,
    refreshKey,
}: {
    error?: string;
    refreshKey: number;
}) {
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [selected, setSelected] = useState('');
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        setSelected('');
        setFailed(false);

        try {
            const res = await fetch('/captcha', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!res.ok) {
                throw new Error();
            }

            setChallenge(await res.json());
        } catch {
            setFailed(true);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                    Verificación de seguridad
                </span>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                    <RefreshCw className="size-3" /> Otra pregunta
                </button>
            </div>

            {failed && (
                <p className="text-sm text-red-600">
                    No se pudo cargar la verificación. Pulsa “Otra pregunta”.
                </p>
            )}

            {challenge && (
                <>
                    <img
                        src={challenge.image}
                        alt="Pregunta de verificación"
                        className="w-full rounded-lg border select-none"
                        draggable={false}
                    />
                    <input type="hidden" name="captcha" value={selected} />
                    <div className="grid grid-cols-2 gap-2">
                        {challenge.options.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => setSelected(o.id)}
                                aria-pressed={selected === o.id}
                                className={cn(
                                    'rounded-lg border px-3 py-2 text-sm transition',
                                    selected === o.id
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'hover:bg-accent',
                                )}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <InputError message={error} />
        </div>
    );
}
