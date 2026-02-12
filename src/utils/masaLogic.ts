import { roundTwo, calculateMaxNetProfit } from './mathUtils';

export const calculateStake = (
    currentCapital: number,
    remainingEvents: number,
    remainingWins: number,
    quota: number,
    targetCapital: number,
    currentQuota?: number
): number => {
    const q = Number(currentQuota || quota);
    const c = Number(currentCapital);
    const t = Number(targetCapital);
    const re = Math.floor(remainingEvents);
    const rw = Math.floor(remainingWins);

    if (rw <= 0 || re <= 0 || rw > re || q <= 1) return 0;

    const memo: Record<string, number> = {};
    const getRequired = (e: number, w: number): number => {
        if (w <= 0) return t;
        if (w > e) return Infinity;
        const key = `${e}_${w}`;
        if (memo[key] !== undefined) return memo[key];

        const reqWin = getRequired(e - 1, w - 1);
        const reqLoss = getRequired(e - 1, w);

        if (reqWin === Infinity) return Infinity;

        if (reqLoss === Infinity) {
            const res = reqWin / q;
            memo[key] = res;
            return res;
        }

        const res = (reqLoss * (q - 1) + reqWin) / q;
        memo[key] = res;
        return res;
    };

    const reqNow = getRequired(re, rw);
    if (reqNow === Infinity || reqNow <= 0) return 0;

    const reqWin = getRequired(re - 1, rw - 1);
    const reqLoss = getRequired(re - 1, rw);
    const lossVal = reqLoss === Infinity ? 0 : reqLoss;

    const theoreticalStake = (reqWin - lossVal) / q;
    const scalingFactor = c / reqNow;
    const stake = theoreticalStake * scalingFactor;

    return Math.max(0, Math.min(stake, c));
};

export const getRescueSuggestion = (
    currentPlan: {
        startCapital: number;
        currentCapital: number;
        quota: number;
        totalEvents: number;
        expectedWins: number;
        remainingEvents: number;
        remainingWins: number;
        isRescued: boolean;
    } | null,
    extraCapital: number = 0
) => {
    if (!currentPlan) return null;

    const targetBE = Number(currentPlan.startCapital);
    const currentCap = Number(currentPlan.currentCapital);
    const effectiveCap = currentCap + Number(extraCapital);
    const quota = Number(currentPlan.quota);

    // The user wants a NEW configuration that doesn't exceed the original plan's duration
    const maxN = currentPlan.totalEvents;

    // Trigger check
    const winsNeeded = currentPlan.remainingWins;
    const eventsLeft = currentPlan.remainingEvents;
    const errors = (currentPlan.totalEvents - currentPlan.expectedWins) - (currentPlan.remainingEvents - currentPlan.remainingWins);
    const totalAllowedErrors = currentPlan.totalEvents - currentPlan.expectedWins;
    const winsExhausted = currentPlan.remainingWins === 0 && currentCap < targetBE - 0.01;

    const currentStake = calculateStake(currentCap, eventsLeft, winsNeeded, quota, targetBE);
    const isStakeTooHigh = currentStake > currentCap * 0.20;

    // Do not suggest if healthy or already at target
    if (currentCap >= targetBE - 0.05) return null;
    if (!winsExhausted && !isStakeTooHigh && errors < totalAllowedErrors * 0.7 && !currentPlan.isRescued) return null;

    interface Candidate {
        n: number;
        k: number;
        stake: number;
        ratio: number;
    }

    let candidates: Candidate[] = [];

    // Search for a new (N, K) configuration
    // Optimization: N should be between 2 and maxN (original plan size)
    for (let nNew = 2; nNew <= maxN; nNew++) {
        for (let kNew = 1; kNew < nNew; kNew++) {
            const potentialProfit = calculateMaxNetProfit(effectiveCap, nNew, kNew, quota);
            if (effectiveCap + potentialProfit >= targetBE - 0.1) {
                const stake = calculateStake(effectiveCap, nNew, kNew, quota, targetBE);
                if (stake > 0) {
                    candidates.push({ n: nNew, k: kNew, stake, ratio: stake / effectiveCap });
                }
                // Smallest K for this N found, move to next N
                break;
            }
        }
    }

    if (candidates.length === 0) return null;

    // Filtration: prefer 5-15% stake
    let safeOnes = candidates.filter(c => c.ratio >= 0.04 && c.ratio <= 0.15);

    let best: Candidate;
    if (safeOnes.length > 0) {
        // If multiple safe ones, pick the one with largest N (more flexible)
        best = safeOnes.sort((a, b) => b.n - a.n)[0];
    } else {
        // Otherwise pick the one closest to a 10% stake
        best = candidates.sort((a, b) => Math.abs(a.ratio - 0.10) - Math.abs(b.ratio - 0.10))[0];
    }

    // Now convert the new Plan (best.n, best.k) into "Additions" to the current remaining state
    const eToAdd = Math.max(0, best.n - eventsLeft);
    const wToAdd = Math.max(0, best.k - winsNeeded);

    return {
        eventsToAdd: eToAdd,
        winsToAdd: wToAdd,
        targetCapital: targetBE,
        suggestedExtraCapital: 0,
        estimatedStake: best.stake
    };
};
