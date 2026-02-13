import { calculateMaxNetProfit, calculateMasaDenominator } from './mathUtils';

export const calculateStake = (
    currentCapital: number,
    remainingEvents: number,
    remainingWins: number,
    quota: number,
    targetCapital: number,
    maxLosses: number = 0,
    currentCL: number = 0
): number => {
    const q = Number(quota);
    const c = Number(currentCapital);
    const t = Number(targetCapital);
    const re = Math.floor(remainingEvents);
    const rw = Math.floor(remainingWins);
    const m = Math.floor(maxLosses);
    const cl = Math.floor(currentCL);

    if (rw <= 0 || re <= 0 || rw > re || q <= 1) return 0;
    if (m > 0 && cl > m) return 0;

    const denNow = calculateMasaDenominator(re, rw, cl, m, q);
    const reqNow = (t * denNow) / Math.pow(q, re);

    if (reqNow <= 0) return 0;

    const denWin = calculateMasaDenominator(re - 1, rw - 1, 0, m, q);
    const reqWin = (t * denWin) / Math.pow(q, re - 1);

    const denLoss = calculateMasaDenominator(re - 1, rw, cl + 1, m, q);
    const reqLoss = (t * denLoss) / Math.pow(q, re - 1);

    const scalingFactor = c / reqNow;
    const theoreticalStake = (reqWin - reqLoss) / q;
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
        maxConsecutiveLosses?: number;
    } | null,
    extraCapital: number = 0
) => {
    if (!currentPlan) return null;

    const targetBE = Number(currentPlan.startCapital);
    const currentCap = Number(currentPlan.currentCapital);
    const effectiveCap = currentCap + Number(extraCapital);
    const quota = Number(currentPlan.quota);
    const m = currentPlan.maxConsecutiveLosses || 0;

    const maxN = currentPlan.totalEvents;

    const winsNeeded = currentPlan.remainingWins;
    const eventsLeft = currentPlan.remainingEvents;
    const errors = (currentPlan.totalEvents - currentPlan.expectedWins) - (currentPlan.remainingEvents - currentPlan.remainingWins);
    const totalAllowedErrors = currentPlan.totalEvents - currentPlan.expectedWins;
    const winsExhausted = currentPlan.remainingWins === 0 && currentCap < targetBE - 0.01;

    // For rescue suggestion, we don't know the currentCL of the potential new plan (it's a reset)
    // so we assume currentCL = 0 for the search.
    const currentStake = calculateStake(currentCap, eventsLeft, winsNeeded, quota, targetBE, m, 0);
    const isStakeTooHigh = currentStake > currentCap * 0.20;

    if (currentCap >= targetBE - 0.05) return null;
    if (!winsExhausted && !isStakeTooHigh && errors < totalAllowedErrors * 0.7 && !currentPlan.isRescued) return null;

    interface Candidate {
        n: number;
        k: number;
        stake: number;
        ratio: number;
    }

    let candidates: Candidate[] = [];

    for (let nNew = 2; nNew <= maxN; nNew++) {
        for (let kNew = 1; kNew < nNew; kNew++) {
            const potentialProfit = calculateMaxNetProfit(effectiveCap, nNew, kNew, quota, m);
            if (effectiveCap + potentialProfit >= targetBE - 0.1) {
                const stake = calculateStake(effectiveCap, nNew, kNew, quota, targetBE, m, 0);
                if (stake > 0) {
                    candidates.push({ n: nNew, k: kNew, stake, ratio: stake / effectiveCap });
                }
                break;
            }
        }
    }

    if (candidates.length === 0) return null;

    let safeOnes = candidates.filter(c => c.ratio >= 0.04 && c.ratio <= 0.15);

    let best: Candidate;
    if (safeOnes.length > 0) {
        best = safeOnes.sort((a, b) => b.n - a.n)[0];
    } else {
        best = candidates.sort((a, b) => Math.abs(a.ratio - 0.10) - Math.abs(b.ratio - 0.10))[0];
    }

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
