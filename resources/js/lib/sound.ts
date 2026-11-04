/**
 * Sonidos de interfaz sintetizados con Web Audio (sin archivos de audio).
 * Cortos y suaves; el usuario puede silenciarlos y la preferencia se recuerda.
 */

export type SoundName =
    | 'click'
    | 'toggle'
    | 'open'
    | 'pick'
    | 'hover'
    | 'drop'
    | 'win'
    | 'lose'
    | 'success'
    | 'error';

const KEY = 'defynia:sound';
const VOLUME = 0.12;

let ctx: AudioContext | null = null;
let muted = (() => {
    try {
        return localStorage.getItem(KEY) === 'off';
    } catch {
        return false;
    }
})();
const listeners = new Set<() => void>();

function audio(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!ctx) {
        const Ctor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;

        if (!Ctor) {
            return null;
        }

        ctx = new Ctor();
    }

    if (ctx.state === 'suspended') {
        void ctx.resume();
    }

    return ctx;
}

type Note = {
    f: number; // frecuencia inicial (Hz)
    to?: number; // frecuencia final (deslizamiento)
    at?: number; // retraso (s)
    dur: number; // duración (s)
    type?: OscillatorType;
    vol?: number; // multiplicador de volumen
};

function play(notes: Note[]) {
    const c = audio();

    if (!c || muted) {
        return;
    }

    const now = c.currentTime;

    for (const n of notes) {
        const start = now + (n.at ?? 0);
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = n.type ?? 'sine';
        osc.frequency.setValueAtTime(n.f, start);

        if (n.to) {
            osc.frequency.exponentialRampToValueAtTime(n.to, start + n.dur);
        }

        const peak = VOLUME * (n.vol ?? 1);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);

        osc.connect(gain).connect(c.destination);
        osc.start(start);
        osc.stop(start + n.dur + 0.02);
    }
}

const SOUNDS: Record<SoundName, Note[]> = {
    // Clic seco y corto
    click: [{ f: 520, to: 340, dur: 0.06, type: 'triangle', vol: 0.9 }],
    // Interruptores, casillas, pestañas
    toggle: [
        { f: 420, dur: 0.05, type: 'triangle' },
        { f: 640, at: 0.05, dur: 0.07, type: 'triangle' },
    ],
    // Abrir menús o diálogos
    open: [{ f: 330, to: 620, dur: 0.1, type: 'sine', vol: 0.8 }],
    // Tomar una tarjeta del pipeline
    pick: [{ f: 300, to: 520, dur: 0.09, type: 'triangle' }],
    // Pasar sobre otra columna
    hover: [{ f: 760, dur: 0.03, type: 'sine', vol: 0.4 }],
    // Soltar una tarjeta
    drop: [
        { f: 220, to: 110, dur: 0.12, type: 'sine', vol: 1.3 },
        { f: 440, to: 330, dur: 0.05, type: 'triangle', vol: 0.5 },
    ],
    // Oportunidad ganada: fanfarria ascendente
    win: [
        { f: 523.25, dur: 0.14, type: 'triangle' },
        { f: 659.25, at: 0.11, dur: 0.14, type: 'triangle' },
        { f: 783.99, at: 0.22, dur: 0.14, type: 'triangle' },
        { f: 1046.5, at: 0.33, dur: 0.55, type: 'triangle', vol: 1.2 },
        { f: 1318.5, at: 0.33, dur: 0.55, type: 'sine', vol: 0.5 },
        { f: 1568, at: 0.5, dur: 0.5, type: 'sine', vol: 0.4 },
    ],
    // Oportunidad perdida: dos notas descendentes
    lose: [
        { f: 330, dur: 0.16, type: 'sawtooth', vol: 0.35 },
        { f: 247, at: 0.15, dur: 0.3, type: 'sawtooth', vol: 0.35 },
    ],
    // Acción completada
    success: [
        { f: 587, dur: 0.08, type: 'sine' },
        { f: 880, at: 0.07, dur: 0.14, type: 'sine' },
    ],
    // Error de validación
    error: [
        { f: 200, dur: 0.1, type: 'square', vol: 0.4 },
        { f: 160, at: 0.1, dur: 0.14, type: 'square', vol: 0.4 },
    ],
};

export function playSound(name: SoundName) {
    play(SOUNDS[name]);
}

export function isMuted() {
    return muted;
}

export function setMuted(value: boolean) {
    muted = value;

    try {
        localStorage.setItem(KEY, value ? 'off' : 'on');
    } catch {
        // sin almacenamiento: la preferencia dura sólo la sesión
    }

    listeners.forEach((l) => l());

    if (!value) {
        playSound('toggle');
    }
}

export function subscribeMuted(listener: () => void) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
