import { Form, Head, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import MicrosoftButton from '@/components/microsoft-button';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inicio de sesión en dos pasos: primero el correo, después la contraseña. */
export default function Login({ status, canResetPassword }: Props) {
    const { microsoftEnabled } = usePage<{ microsoftEnabled: boolean }>().props;
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [checking, setChecking] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === 2) {
            passwordRef.current?.focus();
        }
    }, [step]);

    // Paso 1 → 2. Es sólo de presentación: no consulta si el correo existe
    // (evita revelar qué cuentas están registradas); las credenciales se validan al final.
    const next = () => {
        const value = email.trim();

        if (!EMAIL.test(value)) {
            setEmailError('Escribe un correo electrónico válido.');

            return;
        }

        setEmailError('');
        setEmail(value);
        setChecking(true);
        // 1) botón en "verificando"  2) el paso 1 sale deslizándose  3) entra el paso 2
        window.setTimeout(() => setLeaving(true), 450);
        window.setTimeout(() => {
            setChecking(false);
            setLeaving(false);
            setStep(2);
        }, 450 + 320);
    };

    return (
        <>
            <Head title="Iniciar sesión" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        {/* El correo viaja siempre; el campo visible del paso 1 no tiene name. */}
                        <input
                            type="email"
                            name="email"
                            value={email}
                            readOnly
                            tabIndex={-1}
                            autoComplete="username"
                            className="sr-only"
                            aria-hidden
                        />

                        {/* Progreso: la segunda barra se llena al pasar a la contraseña */}
                        <div className="flex gap-2" aria-hidden>
                            <span className="bg-primary h-1 flex-1 rounded-full" />
                            <span className="bg-border relative h-1 flex-1 overflow-hidden rounded-full">
                                <span
                                    className={`bg-primary absolute inset-0 origin-left rounded-full transition-transform duration-700 ease-out ${step === 2 || leaving ? 'scale-x-100' : 'scale-x-0'}`}
                                />
                            </span>
                        </div>

                        <div
                            key={step}
                            className={
                                leaving
                                    ? 'animate-out fade-out slide-out-to-left-8 fill-mode-forwards flex flex-col gap-6 blur-[1px] duration-300 motion-reduce:[--tw-exit-translate-x:0]'
                                    : `animate-in fade-in flex flex-col gap-6 duration-400 motion-reduce:[--tw-enter-translate-x:0] ${step === 2 ? 'slide-in-from-right-8' : 'slide-in-from-left-8'}`
                            }
                        >
                            {step === 1 ? (
                                <>
                                    {microsoftEnabled && (
                                        <div className="grid gap-5">
                                            <MicrosoftButton>
                                                Iniciar sesión con Microsoft 365
                                            </MicrosoftButton>
                                            <div className="text-muted-foreground flex items-center gap-3 text-xs">
                                                <span className="bg-border h-px flex-1" />
                                                o con tu correo
                                                <span className="bg-border h-px flex-1" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label htmlFor="email-step">
                                            Correo electrónico
                                        </Label>
                                        <Input
                                            id="email-step"
                                            type="email"
                                            autoFocus
                                            autoComplete="email"
                                            placeholder="correo@empresa.mx"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setEmailError('');
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    next();
                                                }
                                            }}
                                            className="h-11"
                                        />
                                        <InputError
                                            message={emailError || errors.email}
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        className="h-11 w-full"
                                        disabled={checking || !email.trim()}
                                        onClick={next}
                                    >
                                        {checking ? <Spinner /> : null}
                                        Continuar
                                        {!checking && <ArrowRight />}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="bg-secondary hover:bg-accent animate-in fade-in slide-in-from-top-3 fill-mode-backwards flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition duration-500"
                                        title="Cambiar de cuenta"
                                    >
                                        <span className="relative shrink-0">
                                            <span
                                                className="animate-in zoom-in-50 fill-mode-backwards flex size-9 items-center justify-center rounded-full text-sm font-bold text-white uppercase duration-500"
                                                style={{
                                                    background:
                                                        'var(--brand-gradient)',
                                                }}
                                            >
                                                {email.charAt(0)}
                                            </span>
                                            <span
                                                style={{
                                                    animationDelay: '350ms',
                                                }}
                                                className="animate-in zoom-in-0 fill-mode-backwards ring-background absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-green-500 text-white ring-2 duration-300"
                                            >
                                                <Check className="size-2.5" />
                                            </span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="text-muted-foreground block text-[11px]">
                                                Iniciando sesión como
                                            </span>
                                            <span className="block truncate text-sm font-medium">
                                                {email}
                                            </span>
                                        </span>
                                        <ArrowLeft className="text-muted-foreground size-4" />
                                    </button>

                                    <div
                                        style={{ animationDelay: '140ms' }}
                                        className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards grid gap-2 duration-500"
                                    >
                                        <div className="flex items-center">
                                            <Label htmlFor="password">
                                                Contraseña
                                            </Label>
                                            {canResetPassword && (
                                                <TextLink
                                                    href={request()}
                                                    className="ml-auto text-sm"
                                                    tabIndex={5}
                                                >
                                                    ¿Olvidaste tu contraseña?
                                                </TextLink>
                                            )}
                                        </div>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            ref={passwordRef}
                                            required
                                            tabIndex={1}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            className="h-11"
                                        />
                                        <InputError
                                            message={
                                                errors.email || errors.password
                                            }
                                        />
                                    </div>

                                    <div
                                        style={{ animationDelay: '230ms' }}
                                        className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex items-center space-x-3 duration-500"
                                    >
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            tabIndex={2}
                                        />
                                        <Label htmlFor="remember">
                                            Recordarme
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        style={{ animationDelay: '320ms' }}
                                        className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards h-11 w-full duration-500"
                                        tabIndex={3}
                                        disabled={processing}
                                        data-test="login-button"
                                    >
                                        {processing && <Spinner />}
                                        Entrar
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="text-muted-foreground text-center text-sm">
                            ¿No tienes acceso? Solicítalo a tu administrador.
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Inicia sesión',
    description: 'Bienvenido de vuelta. Continúa donde te quedaste.',
};
