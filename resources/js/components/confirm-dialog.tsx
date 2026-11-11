import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';

type ConfirmOptions = {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    /** Acción destructiva (rojo). Por defecto true. */
    destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let listener: ((p: Pending) => void) | null = null;

/**
 * Reemplazo del confirm() nativo del navegador. Devuelve una promesa:
 *   if (await confirmAction({ title: '¿Eliminar…?' })) { … }
 * Requiere que <ConfirmDialogHost /> esté montado (ver app.tsx).
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        if (!listener) {
            resolve(false);

            return;
        }

        listener({ ...options, resolve });
    });
}

export function ConfirmDialogHost() {
    const [pending, setPending] = useState<Pending | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        listener = (p) => {
            setPending(p);
            setOpen(true);
        };

        return () => {
            listener = null;
        };
    }, []);

    const answer = (ok: boolean) => {
        pending?.resolve(ok);
        setOpen(false);
    };

    const destructive = pending?.destructive ?? true;
    const Icon = destructive ? AlertTriangle : HelpCircle;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && answer(false)}>
            <DialogContent className="sm:max-w-md">
                <div className="flex gap-4">
                    <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${destructive ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-accent text-primary'}`}
                    >
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 space-y-1.5 pt-0.5">
                        <DialogTitle className="text-left">
                            {pending?.title}
                        </DialogTitle>
                        <DialogDescription className="text-left whitespace-pre-line">
                            {pending?.description ??
                                (destructive
                                    ? 'Esta acción no se puede deshacer.'
                                    : '')}
                        </DialogDescription>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => answer(false)}>
                        {pending?.cancelText ?? 'Cancelar'}
                    </Button>
                    <Button
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={() => answer(true)}
                    >
                        {pending?.confirmText ?? 'Confirmar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
