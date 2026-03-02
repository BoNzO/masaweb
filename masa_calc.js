const nCr = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = (res * (n - i + 1)) / i;
    }
    return res;
};

const calculateMasaDenominator = (n, k, q) => {
    if (k <= 0) return Math.pow(q, n);
    if (n === 0) return k <= 0 ? 1 : 0;

    // Using the iterative logic from the codebase
    let denominator = 0;
    for (let i = k; i <= n; i++) {
        denominator += nCr(n, i) * Math.pow(q - 1, n - i);
    }
    return denominator;
};

const getMultiplier = (n, k, q) => {
    const den = calculateMasaDenominator(n, k, q);
    return Math.pow(q, n) / den;
};

const q = 2.0;

console.log("FATHER OPTIONS (q=2.0):");
for (let n = 1; n <= 6; n++) {
    for (let k = 1; k <= n; k++) {
        const m = getMultiplier(n, k, q);
        console.log(`Masa(${n}, ${k}, q=${q}) -> Multiplier: ${m.toFixed(4)} (+${((m - 1) * 100).toFixed(2)}%)`);
    }
}

console.log("\nSON OPTIONS (q=3.0):");
const q3 = 3.0;
const son_n = 18;
for (let k = 6; k <= 9; k++) {
    const m = getMultiplier(son_n, k, q3);
    console.log(`Masa(${son_n}, ${k}, q=${q3}) -> Multiplier: ${m.toFixed(4)} (+${((m - 1) * 100).toFixed(2)}%)`);
}
