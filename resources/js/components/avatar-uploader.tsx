import { router, usePage } from '@inertiajs/react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import type { Auth } from '@/types';

const MAX_MB = 4;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Carga, vista previa inmediata y eliminación de la foto de perfil. */
export default function AvatarUploader() {
    const { auth, errors } = usePage<{
        auth: Auth;
        errors: Record<string, string>;
    }>().props;
    const user = auth.user;
    const getInitials = useInitials();
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [localError, setLocalError] = useState<string>();

    // Libera la URL temporal de la vista previa.
    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview],
    );

    const pick = (file: File | undefined) => {
        if (!file) return;

        setLocalError(undefined);

        if (!TYPES.includes(file.type)) {
            setLocalError('Usa una imagen JPG, PNG o WEBP.');

            return;
        }

        if (file.size > MAX_MB * 1024 * 1024) {
            setLocalError(`La imagen no debe pesar más de ${MAX_MB} MB.`);

            return;
        }

        setPreview(URL.createObjectURL(file));
        setBusy(true);
        router.post(
            '/settings/profile/avatar',
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setPreview(null);

                    if (input.current) input.current.value = '';
                },
                onError: () => toast.error('No se pudo subir la foto.'),
            },
        );
    };

    const remove = () => {
        if (!confirm('¿Quitar tu foto de perfil?')) return;

        setBusy(true);
        router.delete('/settings/profile/avatar', {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-5">
                <div className="group relative">
                    <Avatar className="size-24 overflow-hidden rounded-full border-2 shadow-sm">
                        <AvatarImage
                            src={preview ?? user.avatar ?? undefined}
                            alt={user.name}
                            className="object-cover"
                        />
                        <AvatarFallback className="bg-accent text-primary text-2xl font-semibold">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <button
                        type="button"
                        onClick={() => input.current?.click()}
                        disabled={busy}
                        aria-label="Cambiar foto"
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                    >
                        {busy ? (
                            <Loader2 className="size-6 animate-spin" />
                        ) : (
                            <Camera className="size-6" />
                        )}
                    </button>
                </div>

                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => input.current?.click()}
                        >
                            <Camera />
                            {user.avatar ? 'Cambiar foto' : 'Subir foto'}
                        </Button>
                        {user.avatar && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={busy}
                                onClick={remove}
                            >
                                <Trash2 className="text-red-600" /> Quitar
                            </Button>
                        )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        JPG, PNG o WEBP · máximo {MAX_MB} MB. Se recorta en
                        cuadrado.
                    </p>
                </div>
            </div>

            <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
            />
            <InputError message={localError ?? errors?.avatar} />
        </div>
    );
}
