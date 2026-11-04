import { router } from '@inertiajs/react';
import { useEffect, useSyncExternalStore } from 'react';
import { isMuted, playSound, subscribeMuted } from '@/lib/sound';
import type { SoundName } from '@/lib/sound';

/** Sonido según el elemento pulsado; null = sin sonido. */
function soundFor(target: HTMLElement): SoundName | null {
    // Un elemento puede declarar su propio sonido o desactivarlo: data-sound="off|open|success…"
    const own = target.closest<HTMLElement>('[data-sound]');

    if (own) {
        const v = own.dataset.sound;

        return v === 'off' ? null : (v as SoundName);
    }

    const el = target.closest<HTMLElement>(
        'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="option"], summary, label[for]',
    );

    if (!el || el.matches(':disabled, [aria-disabled="true"]')) {
        return null;
    }

    const role = el.getAttribute('role');

    if (role === 'switch' || role === 'checkbox' || role === 'tab') {
        return 'toggle';
    }

    if (el.hasAttribute('aria-haspopup') || el.matches('[aria-expanded]')) {
        return 'open';
    }

    return 'click';
}

/** Clics globales + respuesta a los eventos de navegación de Inertia. */
export function useSoundEffects() {
    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (e.button !== 0 || !(e.target instanceof HTMLElement)) {
                return;
            }

            const sound = soundFor(e.target);

            if (sound) {
                playSound(sound);
            }
        };

        document.addEventListener('pointerdown', onDown, true);

        // Errores de validación al enviar un formulario
        const offError = router.on('error', () => playSound('error'));

        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            offError();
        };
    }, []);
}

/** Estado de silencio reactivo para el botón del encabezado. */
export function useMuted() {
    return useSyncExternalStore(subscribeMuted, isMuted, () => false);
}
