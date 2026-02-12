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

export const calculateMaxNetProfit = (startCapital: number, n: number, k: number, p: number): number => {
    let denominator = 0;
    for (let i = k; i <= n; i++) {
        denominator += nCr(n, i) * Math.pow(p - 1, n - i);
    }
    const totalPayout = (startCapital * Math.pow(p, n)) / denominator;
    return totalPayout - startCapital;
};
