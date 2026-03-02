import { calculateMaxNetProfit, calculateMasaDenominator } from './mathUtils';
import type { Config, MasaPlan } from '../types/masaniello';

export const createInitialPlan = (config: Config, startCapital?: number, persistentWeeklyTarget?: number, persistentWeeklyBaseline?: number): MasaPlan => {
    const capital = startCapital !== undefined ? Math.ceil(startCapital) : Math.ceil(config.initialCapital);
    const maxProfit = calculateMaxNetProfit(
        capital,
        config.totalEvents,
        config.expectedWins,
        config.quota,
        config.maxConsecutiveLosses || 0
    );
    return {
        id: Date.now(),
        startCapital: capital,
        currentCapital: capital,
        targetCapital: capital + maxProfit,
        currentWeeklyTarget: persistentWeeklyTarget || (capital * (1 + (config.weeklyTargetPercentage || 0) / 100)),
        startWeeklyBaseline: persistentWeeklyBaseline || capital,
        maxNetProfit: maxProfit,
        quota: config.quota,
        totalEvents: config.totalEvents,
        expectedWins: config.expectedWins,
        events: [],
        remainingEvents: config.totalEvents,
        remainingWins: config.expectedWins,
        wins: 0,
        losses: 0,
        status: 'active',
        triggeredRule: null,
        wasNegative: false,
        accumulatedAmount: 0,
        isRescued: false,
        createdAt: new Date().toISOString(),
        generationNumber: 0,
        maxConsecutiveLosses: config.maxConsecutiveLosses,
        currentConsecutiveLosses: 0,
        parentId: null,
        childrenIds: [],
        treeStatus: 'active',
        tags: [],
        role: config.role,
        feedForwardConfig: config.feedForwardConfig,
        feedSource: config.feedSource,
        elasticStretchesUsed: 0,
        hierarchyType: config.hierarchyType || 'STANDALONE',
        fatherPlanId: config.fatherPlanId || null,
        fatherEventId: config.fatherEventId || null,
        fatherStake: config.fatherStake,
        fatherQuota: config.fatherQuota,
        tradingCommission: config.tradingCommission
    };
};

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

    const theoreticalStake = (reqWin - reqLoss) / q;
    let stake = 0;

    if (c > reqNow) {
        // Surplus: Use surplus to reduce effective target difficulty (Relax Mode)
        const surplus = c - reqNow;
        const effectiveTarget = t - surplus;
        const relaxationFactor = effectiveTarget / t;
        stake = theoreticalStake * relaxationFactor;
    } else {
        // Deficit: Standard Masaniello Safety Scaling
        const scalingFactor = c / reqNow;
        stake = theoreticalStake * scalingFactor;
    }

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

export const getEarlyClosureSuggestion = (
    currentPlan: {
        startCapital: number;
        currentCapital: number;
        quota: number;
        totalEvents: number;
        expectedWins: number;
        remainingEvents: number;
        remainingWins: number;
        maxNetProfit: number;
    } | null
) => {
    if (!currentPlan) return null;

    const { startCapital, currentCapital, maxNetProfit, remainingEvents, remainingWins } = currentPlan;
    const currentProfit = currentCapital - startCapital;

    // Condition 1: High Yield reached (>85% of max profit)
    const yieldReached = currentProfit / maxNetProfit;

    // Condition 2: High Risk on remaining steps (last steps often require huge stakes)
    // If we have few steps left and still need wins, the stake is likely high.
    // Simplifying: if remainingWins > 0 and remainingEvents <= 2 and we have already secured good profit.
    if (yieldReached > 0.85 && remainingWins > 0 && remainingEvents <= 3) {
        return {
            shouldClose: true,
            reason: `Hai raggiunto il ${(yieldReached * 100).toFixed(0)}% del profitto massimo. Rischiare per il restante ${(100 - yieldReached * 100).toFixed(0)}% potrebbe non valere la pena.`,
            profitSecure: currentProfit
        };
    }

    return null;
};

export const calculateTiltThreshold = (
    totalEvents: number,
    expectedWins: number,
    remainingEvents: number,
    remainingWins: number
): number => {
    const totalAllowedErrors = totalEvents - expectedWins;
    const structuralLosses = totalAllowedErrors - (remainingEvents - remainingWins);
    const remainingAllowedErrors = totalAllowedErrors - structuralLosses;
    return Math.max(2, Math.ceil(remainingAllowedErrors * 0.3));
};

/**
 * Calculates the raw Masaniello Health Index (MHI) and its components.
 * Returns the full analysis regardless of urgency thresholds.
 */
export const calculateMasanielloHealth = (
    plan: {
        startCapital: number;
        currentCapital: number;
        targetCapital: number;
        quota: number;
        totalEvents: number;
        expectedWins: number;
        remainingEvents: number;
        remainingWins: number;
        isRescued: boolean;
        maxConsecutiveLosses?: number;
        currentConsecutiveLosses?: number;
    },
    overrideQuota?: number,
    overrideStake?: number
) => {
    const effectiveQuota = overrideQuota || plan.quota;
    const eventsPlayed = plan.totalEvents - plan.remainingEvents;
    const progress = plan.totalEvents > 0 ? eventsPlayed / plan.totalEvents : 0;

    const m = plan.maxConsecutiveLosses || 0;
    const cl = plan.currentConsecutiveLosses || 0;

    const nextStake = overrideStake !== undefined
        ? overrideStake
        : calculateStake(
            plan.currentCapital, plan.remainingEvents, plan.remainingWins,
            effectiveQuota, plan.targetCapital, m, cl
        );

    // Vectors
    const stakeRatio = plan.currentCapital > 0 ? nextStake / plan.currentCapital : 0;

    // Compute baseline ratio from the original configuration to understand what "normal" exposure is for this specific plan
    const initialStake = calculateStake(
        plan.startCapital, plan.totalEvents, plan.expectedWins,
        plan.quota, plan.targetCapital, m, 0
    );
    const baselineRatio = plan.startCapital > 0 ? initialStake / plan.startCapital : 0.15;

    // Set a tolerance threshold that is at least 15%, but scales with aggressive configurations
    const toleranceThreshold = Math.max(0.15, baselineRatio * 1.25);

    let stakeScore = 0;
    if (stakeRatio > toleranceThreshold) {
        // Calculate penalty based on the excess over the specific tolerance
        const excess = stakeRatio - toleranceThreshold;
        stakeScore = Math.min(50, Math.pow(excess * 3.5, 1.5) * 40);
        if (isNaN(stakeScore)) stakeScore = excess * 100;
        stakeScore = Math.min(stakeScore, 50);
    }

    let clScore = 0;
    if (m > 0 && cl > 0) {
        const proximity = cl / m;
        clScore = Math.pow(proximity, 3) * 30;
    }

    let runwayScore = 0;
    if (nextStake > 1) {
        const runway = plan.currentCapital / nextStake;
        if (runway < 2.5) {
            runwayScore = Math.min(20, (2.5 - runway) * 10);
        }
    }

    let deviationScore = 0;
    const winsAchieved = plan.expectedWins - plan.remainingWins;
    const expectedWinsByNow = progress * plan.expectedWins;
    const winDeficit = expectedWinsByNow - winsAchieved;
    if (winDeficit > 0.5) {
        deviationScore = Math.min(winDeficit * 10, 20);
    }

    const totalScore = stakeScore + clScore + runwayScore + deviationScore;
    const isEmergency = stakeRatio > Math.max(0.35, toleranceThreshold * 1.5);

    return {
        score: Math.min(100, Math.round(totalScore)),
        vectors: { stakeScore, clScore, runwayScore, deviationScore },
        isEmergency,
        progress
    };
};

export const getRescueAdvisory = (
    plan: {
        startCapital: number;
        currentCapital: number;
        targetCapital: number;
        quota: number;
        totalEvents: number;
        expectedWins: number;
        remainingEvents: number;
        remainingWins: number;
        isRescued: boolean;
        maxConsecutiveLosses?: number;
        currentConsecutiveLosses?: number;
    } | null,
    overrideQuota?: number,
    overrideStake?: number,
    customThresholds?: { warning: number; critical: number }
): { urgency: 'warning' | 'critical'; score: number; reason: string } | null => {
    if (!plan || plan.isRescued || plan.currentCapital >= plan.targetCapital - 0.01) return null;

    // Immediate Critical triggers (Death Spiral) - Check first
    const capitalRetention = plan.currentCapital / plan.startCapital;
    if (capitalRetention < 0.40) {
        return {
            urgency: 'critical',
            score: 90,
            reason: `Capitale critico (${Math.round(capitalRetention * 100)}% residuo). Rischio rovina imminente.`
        };
    }

    const health = calculateMasanielloHealth(plan, overrideQuota, overrideStake);

    // Gates
    if (health.progress < 0.15 && !health.isEmergency) return null;

    // Thresholds
    const warningThresh = customThresholds?.warning ?? 45;
    const criticalThresh = customThresholds?.critical ?? 75;

    let urgency: 'warning' | 'critical' | null = null;
    if (health.score >= criticalThresh || health.isEmergency) urgency = 'critical';
    else if (health.score >= warningThresh) urgency = 'warning';

    if (!urgency) return null;

    // Reasons
    const reasons: string[] = [];

    if (health.vectors.stakeScore > 25) reasons.push(`esposizione elevata`);
    if (health.vectors.clScore > 10) reasons.push(`vicinanza Red Line`);
    if (health.vectors.runwayScore > 10) reasons.push(`riserve scarse`);
    if (health.vectors.deviationScore > 10) reasons.push(`trend negativo`);

    if (reasons.length === 0) reasons.push(`stress sistemico`);

    let reasonText = urgency === 'critical'
        ? `Situazione insostenibile: ${reasons.join(', ')}. Attiva il Rescue.`
        : `Rischio elevato: ${reasons.join(', ')}.`;

    return { urgency, score: health.score, reason: reasonText };
};

export const lockProfitInPlan = (plan: MasaPlan, amount: number): MasaPlan => {
    const isPlanStart = plan.events.filter(e => !e.isSystemLog).length === 0;
    const newCapital = Math.round((plan.currentCapital - amount) * 100) / 100;
    const newStartCapital = isPlanStart ? Math.round((plan.startCapital - amount) * 100) / 100 : plan.startCapital;

    // Recalculate target based on new capital and remaining progress
    const remainingProfit = calculateMaxNetProfit(
        newCapital,
        plan.remainingEvents,
        plan.remainingWins,
        plan.quota,
        plan.maxConsecutiveLosses || 0
    );
    const newTarget = Math.round((newCapital + remainingProfit) * 100) / 100;

    return {
        ...plan,
        currentCapital: newCapital,
        startCapital: newStartCapital,
        targetCapital: newTarget,
        maxNetProfit: Math.round((newTarget - newStartCapital) * 100) / 100,
        accumulatedAmount: Math.round(((plan.accumulatedAmount || 0) + amount) * 100) / 100,
        events: [...plan.events, {
            id: `system_lock_${Date.now()}`,
            stake: 0,
            isWin: false,
            isVoid: false,
            isPartialSequence: false,
            isSystemLog: true,
            message: `LOCKED PROFIT: €${amount}`,
            capitalAfter: newCapital,
            eventsLeft: plan.remainingEvents,
            winsLeft: plan.remainingWins,
            timestamp: new Date().toISOString(),
            snapshot: {
                config: {
                    initialCapital: newStartCapital,
                    quota: plan.quota,
                    totalEvents: plan.totalEvents,
                    expectedWins: plan.expectedWins,
                    accumulationPercent: 50,
                    weeklyTargetPercentage: 20,
                    milestoneBankPercentage: 20
                },
                activeRules: [],
                isRescued: plan.isRescued,
                currentConsecutiveLosses: plan.currentConsecutiveLosses || 0,
                targetCapital: newTarget
            }
        }]
    };
};
