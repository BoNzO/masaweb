export const roundTwo = (num: number | string) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

export const nCr = (n: number, k: number): number => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = (res * (n - i + 1)) / i;
    }
    return res;
};

const masaMemo: Record<string, number> = {};

/**
 * Calculates the recursive denominator for Masaniello payout.
 * Supports the "max consecutive losses" (m) condition.
 */
export const calculateMasaDenominator = (n: number, k: number, cl: number, m: number, q: number): number => {
    // If wins are achieved, the plan is successful regardless of future (unplayed) events.
    // Return total weight of remaining paths (q^n).
    if (k <= 0) return Math.pow(q, n);

    if (m > 0 && cl > m) return 0;
    if (n === 0) return k <= 0 ? 1 : 0;

    const key = `${n}_${k}_${cl}_${m}_${q}`;
    if (masaMemo[key] !== undefined) return masaMemo[key];

    // Win path (cl resets to 0, k decreases)
    const winPart = calculateMasaDenominator(n - 1, k - 1, 0, m, q);
    // Loss path (cl increases, k stays same, result multiplied by Q-1)
    const lossPart = (q - 1) * calculateMasaDenominator(n - 1, k, cl + 1, m, q);

    const res = winPart + lossPart;
    masaMemo[key] = res;
    return res;
};

export const calculateMaxNetProfit = (startCapital: number, n: number, k: number, q: number, m: number = 0): number => {
    const denominator = calculateMasaDenominator(n, k, 0, m, q);
    if (denominator <= 0) return 0;
    const totalPayout = (startCapital * Math.pow(q, n)) / denominator;
    return totalPayout - startCapital;
};
