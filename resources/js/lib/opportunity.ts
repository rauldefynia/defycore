export type StageKey =
    | 'oportunidad'
    | 'calificado'
    | 'dimensionamiento'
    | 'presentado'
    | 'ganado'
    | 'perdido';

export type Stage = { key: StageKey; label: string };

export type OpportunityCard = {
    id: number;
    name: string;
    stage: StageKey;
    position: number;
    client: string | null;
    expected_close_date: string | null;
    quotes_count: number;
    value: { amount: number; currency: string; amount_mxn: number };
};

/** Colores por etapa: chip (pill), dot/barra de acento y tinte al arrastrar encima. */
export const STAGE_STYLES: Record<
    StageKey,
    { chip: string; dot: string; tint: string; ring: string }
> = {
    oportunidad: {
        chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        dot: 'bg-slate-400',
        tint: 'bg-slate-500/10',
        ring: 'ring-slate-400/60',
    },
    calificado: {
        chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
        dot: 'bg-blue-500',
        tint: 'bg-blue-500/10',
        ring: 'ring-blue-500/60',
    },
    dimensionamiento: {
        chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
        dot: 'bg-violet-500',
        tint: 'bg-violet-500/10',
        ring: 'ring-violet-500/60',
    },
    presentado: {
        chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        dot: 'bg-amber-500',
        tint: 'bg-amber-500/10',
        ring: 'ring-amber-500/60',
    },
    ganado: {
        chip: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
        dot: 'bg-green-500',
        tint: 'bg-green-500/10',
        ring: 'ring-green-500/60',
    },
    perdido: {
        chip: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
        dot: 'bg-red-500',
        tint: 'bg-red-500/10',
        ring: 'ring-red-500/60',
    },
};
