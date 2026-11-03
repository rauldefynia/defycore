import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

/** Pide el motivo al marcar una oportunidad como perdida. */
export function LostReasonDialog({
    open,
    name,
    onCancel,
    onConfirm,
}: {
    open: boolean;
    name: string;
    onCancel: () => void;
    onConfirm: (reason: string) => void;
}) {
    const [reason, setReason] = useState('');

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) {
                    setReason('');
                    onCancel();
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Marcar como perdida</DialogTitle>
                    <DialogDescription>{name}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-1.5">
                    <Label className="text-[12.5px]">
                        Motivo de la pérdida *
                    </Label>
                    <textarea
                        autoFocus
                        rows={3}
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ej. Precio, eligió a la competencia, sin presupuesto…"
                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setReason('');
                            onCancel();
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        disabled={!reason.trim()}
                        onClick={() => {
                            onConfirm(reason.trim());
                            setReason('');
                        }}
                    >
                        Marcar como perdida
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
