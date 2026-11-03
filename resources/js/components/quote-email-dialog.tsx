import { Link, useForm, usePage } from '@inertiajs/react';
import { History, Send, TriangleAlert } from 'lucide-react';
import InputError from '@/components/input-error';
import { MicrosoftLogo } from '@/components/microsoft-button';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Auth } from '@/types';

export type SentEmail = {
    id: number;
    to: string[];
    subject: string;
    attachment: string | null;
    sent_at: string | null;
    user: string | null;
};

type Props = {
    open: boolean;
    onClose: () => void;
    quote: {
        id: number;
        number: string;
        name: string;
        due_date: string | null;
        client_data: { name?: string; email?: string; contact?: string } | null;
    };
    history: SentEmail[];
};

const field =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]';

const fmt = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('es-MX', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';

/** Envía la cotización por correo desde el buzón Microsoft 365 del usuario. */
export default function QuoteEmailDialog({
    open,
    onClose,
    quote,
    history,
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth.user;
    const client = quote.client_data;

    const due = quote.due_date
        ? new Date(`${quote.due_date}T00:00:00`).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : null;

    const form = useForm({
        to: client?.email ?? '',
        cc: '',
        subject: `Cotización ${quote.number}${client?.name ? ` – ${client.name}` : ''}`,
        message:
            `Hola${client?.contact ? ` ${client.contact}` : ''},\n\n` +
            `Adjunto la cotización ${quote.number} (${quote.name})` +
            `${due ? `, vigente hasta el ${due}` : ''}.\n` +
            `Quedo atento a tus comentarios.\n\nSaludos,\n${user.name}`,
        attachment: 'client_mxn',
    });
    const { data, setData, errors } = form;
    // Errores de Microsoft (token expirado, sin permiso, etc.) llegan bajo la clave mail.
    const mailError = (errors as Record<string, string | undefined>).mail;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/cotizaciones/${quote.id}/enviar`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Enviar cotización por correo</DialogTitle>
                    <DialogDescription>
                        Se envía desde tu buzón de Microsoft 365
                        {user.microsoft_email
                            ? ` (${user.microsoft_email})`
                            : ''}{' '}
                        y queda en tus Enviados.
                    </DialogDescription>
                </DialogHeader>

                {!user.microsoft_connected ? (
                    <div className="grid gap-4">
                        <div className="flex gap-2 rounded-lg bg-amber-100 p-3 text-[13px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <TriangleAlert className="size-4 shrink-0" />
                            <span>
                                Aún no has conectado tu cuenta de Microsoft 365.
                                Conéctala en Configuración para poder enviar
                                correos desde el sistema.
                            </span>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>
                                Cerrar
                            </Button>
                            <Button asChild>
                                <Link href="/settings/profile">
                                    <MicrosoftLogo /> Ir a conectar
                                </Link>
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={submit} className="grid gap-4">
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">
                                Para * (separa varios con coma)
                            </Label>
                            <Input
                                value={data.to}
                                onChange={(e) => setData('to', e.target.value)}
                                placeholder="cliente@empresa.com"
                                autoFocus={!data.to}
                            />
                            <InputError message={errors.to} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">CC</Label>
                            <Input
                                value={data.cc}
                                onChange={(e) => setData('cc', e.target.value)}
                            />
                            <InputError message={errors.cc} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">Asunto *</Label>
                            <Input
                                value={data.subject}
                                onChange={(e) =>
                                    setData('subject', e.target.value)
                                }
                            />
                            <InputError message={errors.subject} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">Mensaje *</Label>
                            <textarea
                                rows={7}
                                className={`${field} py-2`}
                                value={data.message}
                                onChange={(e) =>
                                    setData('message', e.target.value)
                                }
                            />
                            <InputError message={errors.message} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-[12.5px]">Adjuntar</Label>
                            <select
                                className={`${field} h-9`}
                                value={data.attachment}
                                onChange={(e) =>
                                    setData('attachment', e.target.value)
                                }
                            >
                                <option value="client_mxn">
                                    PDF de la cotización (MXN)
                                </option>
                                <option value="client_usd">
                                    PDF de la cotización (USD)
                                </option>
                                <option value="none">Sin adjunto</option>
                            </select>
                            <InputError message={errors.attachment} />
                        </div>

                        {mailError && (
                            <div className="flex gap-2 rounded-lg bg-red-100 p-3 text-[13px] text-red-800 dark:bg-red-950 dark:text-red-300">
                                <TriangleAlert className="size-4 shrink-0" />
                                <span>{mailError}</span>
                            </div>
                        )}

                        {history.length > 0 && (
                            <div className="bg-secondary rounded-lg p-3">
                                <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                                    <History className="size-3.5" /> Envíos
                                    anteriores
                                </div>
                                <ul className="grid gap-1 text-xs">
                                    {history.map((h) => (
                                        <li
                                            key={h.id}
                                            className="flex justify-between gap-3"
                                        >
                                            <span className="truncate">
                                                {h.to.join(', ')}
                                            </span>
                                            <span className="text-muted-foreground whitespace-nowrap">
                                                {fmt(h.sent_at)}
                                                {h.user ? ` · ${h.user}` : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <Send />
                                {form.processing ? 'Enviando…' : 'Enviar'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
