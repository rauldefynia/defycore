// Espejo en cliente de App\Services\QuoteCalculator (vista previa en vivo).
// El servidor siempre recalcula al guardar; ambos siguen cotizaciones-logica-negocio.md.

export const TAX_RATE = 0.16;

export const CURRENCIES = [
    'MXN',
    'USD',
    'EUR',
    'CAD',
    'GBP',
    'JPY',
    'CHF',
    'AUD',
    'CNY',
    'BRL',
    'ARS',
    'CLP',
    'COP',
    'PEN',
    'GTQ',
] as const;

const ZERO_DECIMAL = ['JPY', 'CNY', 'ARS', 'CLP', 'COP'];
const COMMA_DECIMAL = ['EUR', 'CHF', 'ARS', 'CLP', 'COP'];

const SYMBOLS: Record<string, string> = {
    MXN: '$',
    USD: 'US$',
    EUR: '€',
    CAD: 'CA$',
    GBP: '£',
    JPY: '¥',
    CHF: 'Fr.',
    AUD: 'A$',
    CNY: '¥',
    BRL: 'R$',
    ARS: '$',
    CLP: '$',
    COP: '$',
    PEN: 'S/',
    GTQ: 'Q',
};

export type ItemInput = {
    item_type: 'producto' | 'servicio';
    description: string;
    detail: string;
    sku: string;
    quantity: number | string;
    cost_unit_without_discount: number | string;
    discount_percent: number | string;
    target_margin_percent: number | string;
    client_discount_percent: number | string;
};

export type QuoteInput = {
    currency: string;
    exchange_rate: number | string;
    global_discount_type: 'percentage' | 'fixed';
    global_discount_value: number | string;
    has_payment_plan: boolean;
    first_payment_type: 'percentage' | 'fixed';
    first_payment_value: number | string;
    first_payment_date: string;
    payment_months: number | string;
};

export type ItemCalc = {
    cost_unit: number;
    cost_total: number;
    sale_unit_price_without_client_discount: number;
    sale_unit_price: number;
    sale_total_price: number;
    unit_profit: number;
    unit_margin_percent: number;
    line_profit: number;
    line_margin_percent: number;
};

export type ScheduleRow = {
    label: string;
    date: string | null;
    amount: number;
    balance: number;
};

export type QuoteCalc = {
    items: ItemCalc[];
    summaryCost: number;
    subtotal: number;
    tax: number;
    totalBefore: number;
    discountAmount: number;
    total: number;
    profit: number;
    marginPercent: number;
    firstAmount: number;
    remaining: number;
    monthly: number;
    schedule: ScheduleRow[];
    downPaymentWarning: boolean;
    productsCost: number;
};

export function decimals(currency: string): number {
    return ZERO_DECIMAL.includes(currency) ? 0 : 2;
}

export function round(value: number, dec = 2): number {
    const f = 10 ** dec;

    return Math.round((value + Number.EPSILON) * f) / f;
}

/** Parser tolerante: acepta 1234.56, 1.234,56 y 1234,56 (§8). */
export function parseNum(raw: unknown): number {
    if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : 0;
    }

    let s = String(raw ?? '')
        .trim()
        .replace(/[^\d.,-]/g, '');

    if (s === '') {
        return 0;
    }

    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');

    if (lastDot >= 0 && lastComma >= 0) {
        s =
            lastComma > lastDot
                ? s.replace(/\./g, '').replace(',', '.')
                : s.replace(/,/g, '');
    } else if (lastComma >= 0) {
        s =
            s.length - lastComma - 1 <= 2
                ? s.replace(',', '.')
                : s.replace(/,/g, '');
    }

    const n = Number(s);

    return Number.isFinite(n) ? n : 0;
}

const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

export function calcItem(i: ItemInput): ItemCalc {
    const qty = Math.max(parseNum(i.quantity), 1);
    const cusd = Math.max(parseNum(i.cost_unit_without_discount), 0);
    const dp = clamp(parseNum(i.discount_percent), 0, 100);
    const tm = clamp(parseNum(i.target_margin_percent), 0, 99.99);
    const cdp = clamp(parseNum(i.client_discount_percent), 0, 100);

    const costUnit = Math.max(cusd - cusd * (dp / 100), 0);
    const costTotal = costUnit * qty;
    const m = tm / 100;
    const saleNoDisc = costUnit > 0 && m < 1 ? costUnit / (1 - m) : 0;
    const saleUnit = Math.max(saleNoDisc - saleNoDisc * (cdp / 100), 0);
    const saleTotal = saleUnit * qty;
    const unitProfit = saleUnit - costUnit;
    const lineProfit = saleTotal - costTotal;

    return {
        cost_unit: costUnit,
        cost_total: costTotal,
        sale_unit_price_without_client_discount: saleNoDisc,
        sale_unit_price: saleUnit,
        sale_total_price: saleTotal,
        unit_profit: unitProfit,
        unit_margin_percent: saleUnit > 0 ? (unitProfit / saleUnit) * 100 : 0,
        line_profit: lineProfit,
        line_margin_percent: saleTotal > 0 ? (lineProfit / saleTotal) * 100 : 0,
    };
}

function addMonths(iso: string, n: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const target = new Date(Date.UTC(y, m - 1 + n, 1));
    const last = new Date(
        Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(d, last));

    return target.toISOString().slice(0, 10);
}

/** Calendario por saldo corriente: la última cuota es el saldo exacto (§7.3 C). */
export function buildSchedule(
    total: number,
    first: number,
    months: number,
    start: string | null,
    dec: number,
): ScheduleRow[] {
    const rows: ScheduleRow[] = [];
    let balance = total;
    const hasDown = first > 0.005;

    if (hasDown) {
        balance = round(balance - first, dec);
        rows.push({ label: 'Anticipo', date: start, amount: first, balance });
    }

    const remaining = balance;

    for (let i = 1; i <= months; i++) {
        const pay = i < months ? round(remaining / months, dec) : balance;
        balance = round(balance - pay, dec);
        rows.push({
            label: `Mes ${i}`,
            date: start ? addMonths(start, hasDown ? i : i - 1) : null,
            amount: pay,
            balance,
        });
    }

    return rows;
}

export function calcQuote(q: QuoteInput, items: ItemInput[]): QuoteCalc {
    const dec = decimals(q.currency);
    const calcs = items.map(calcItem);

    let summaryCost = 0;
    let subtotal = 0;
    let profit = 0;
    let productsCost = 0;

    calcs.forEach((c, idx) => {
        summaryCost += c.cost_total;
        subtotal += c.sale_total_price;
        profit += c.line_profit;

        if (items[idx].item_type === 'producto') {
            productsCost += c.cost_total;
        }
    });

    const tax = subtotal * TAX_RATE;
    const totalBefore = subtotal + tax;
    const dv = Math.max(parseNum(q.global_discount_value), 0);
    let discount =
        q.global_discount_type === 'fixed'
            ? Math.min(dv, totalBefore)
            : totalBefore * (Math.min(dv, 100) / 100);
    discount = Math.max(Math.min(discount, totalBefore), 0);
    const total = round(totalBefore - discount, dec);

    let firstAmount = 0;
    let remaining = 0;
    let monthly = 0;
    let schedule: ScheduleRow[] = [];

    if (q.has_payment_plan) {
        const months = clamp(
            Math.trunc(parseNum(q.payment_months)) || 1,
            1,
            120,
        );
        const fv = Math.max(parseNum(q.first_payment_value), 0);
        firstAmount =
            q.first_payment_type === 'fixed'
                ? Math.min(fv, total)
                : total * (Math.min(fv, 100) / 100);
        firstAmount = round(clamp(firstAmount, 0, total), dec);
        remaining = Math.max(total - firstAmount, 0);
        monthly = remaining / months;
        schedule = buildSchedule(
            total,
            firstAmount,
            months,
            q.first_payment_date || null,
            dec,
        );
    }

    return {
        items: calcs,
        summaryCost,
        subtotal,
        tax,
        totalBefore,
        discountAmount: discount,
        total,
        profit: profit - discount,
        marginPercent:
            subtotal > 0 ? ((profit - discount) / subtotal) * 100 : 0,
        firstAmount,
        remaining,
        monthly,
        schedule,
        downPaymentWarning:
            q.has_payment_plan &&
            productsCost > 0 &&
            firstAmount < productsCost,
        productsCost,
    };
}

export function formatNumber(value: number, currency = 'MXN'): string {
    const dec = decimals(currency);
    const comma = COMMA_DECIMAL.includes(currency);

    return new Intl.NumberFormat(comma ? 'de-DE' : 'en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
        useGrouping: true,
    }).format(Number.isFinite(value) ? value : 0);
}

export function formatMoney(value: number, currency = 'MXN'): string {
    return `${SYMBOLS[currency] ?? currency}${formatNumber(value, currency)}`;
}

export function formatPercent(value: number): string {
    return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}
