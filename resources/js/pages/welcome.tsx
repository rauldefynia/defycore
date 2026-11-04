import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, LogIn } from 'lucide-react';
import { dashboard, login } from '@/routes';

/** Portada mínima: solo la marca y el acceso al inicio de sesión. */
export default function Welcome() {
    const { auth, name } = usePage().props;

    return (
        <>
            <Head title="Bienvenido" />
            <div
                className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
                style={{ background: 'var(--brand-gradient)' }}
            >
                <div className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-fuchsia-500/30 blur-[100px]" />
                <div className="pointer-events-none absolute -bottom-32 -left-24 size-[460px] rounded-full bg-violet-500/35 blur-[110px]" />

                <main className="animate-in fade-in slide-in-from-bottom-4 relative flex flex-col items-center gap-10 text-center duration-700">
                    <img
                        src="/logo.png"
                        alt={String(name)}
                        className="h-14 w-auto sm:h-16"
                    />

                    <Link
                        href={auth.user ? dashboard() : login()}
                        className="text-primary inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.03] hover:bg-white/90 active:scale-[0.98]"
                    >
                        {auth.user ? (
                            <>
                                Ir al panel <ArrowRight className="size-4" />
                            </>
                        ) : (
                            <>
                                <LogIn className="size-4" /> Iniciar sesión
                            </>
                        )}
                    </Link>
                </main>
            </div>
        </>
    );
}
