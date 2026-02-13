import type { MasaPlan } from '../types/masaniello';
import { roundTwo } from './mathUtils';

export interface PerformanceStats {
    totalTrades: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    profitFactor: number;
    equityCurve: { timestamp: string; capital: number; id: string | number }[];
    benchmarks: {
        winRate: number;
        profitFactor: number;
        maxDrawdown: number;
        sharpeRatio: number;
    };
}

export const calculatePerformance = (history: MasaPlan[], currentPlan: MasaPlan | null): PerformanceStats => {
    const allPlans = [...history];
    if (currentPlan) allPlans.push(currentPlan);

    const equityCurve: { timestamp: string; capital: number; id: string | number }[] = [];
    const returns: number[] = [];
    let totalWins = 0;
    let totalLosses = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    // Use current or last config for benchmarks
    const referencePlan = currentPlan || (history.length > 0 ? history[history.length - 1] : null);
    const winRateTarget = referencePlan ? (referencePlan.expectedWins / referencePlan.totalEvents) * 100 : 50;
    const pfTarget = 1.3;
    const ddTarget = referencePlan ? Math.min(25, roundTwo((referencePlan.startCapital * 0.2) / referencePlan.startCapital * 100)) : 20;

    // Initial point
    if (allPlans.length > 0) {
        equityCurve.push({
            timestamp: allPlans[0].createdAt,
            capital: allPlans[0].startCapital,
            id: 'start'
        });
    }

    let lastCapital = allPlans.length > 0 ? allPlans[0].startCapital : 0;

    allPlans.forEach((plan) => {
        const sortedEvents = [...plan.events].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        sortedEvents.forEach((event) => {
            if (!event.isSystemLog || event.message?.includes('Rescue')) {
                equityCurve.push({
                    timestamp: event.timestamp,
                    capital: event.capitalAfter,
                    id: `${plan.id}_${event.id}`
                });

                if (lastCapital > 0) {
                    const ret = (event.capitalAfter - lastCapital) / lastCapital;
                    returns.push(ret);
                }

                const diff = event.capitalAfter - lastCapital;
                if (diff > 0) {
                    grossProfit += diff;
                    if (!event.isSystemLog) totalWins++;
                } else if (diff < 0) {
                    grossLoss += Math.abs(diff);
                    if (!event.isSystemLog) totalLosses++;
                }

                lastCapital = event.capitalAfter;
            }
        });
    });

    // Drawdown Calculation
    let maxDrawdown = 0;
    let peak = 0;
    equityCurve.forEach((point) => {
        if (point.capital > peak) peak = point.capital;
        if (peak > 0) {
            const dd = (peak - point.capital) / peak;
            if (dd > maxDrawdown) maxDrawdown = dd;
        }
    });

    // Sharpe Ratio Calculation
    let sharpeRatio = 0;
    if (returns.length > 1) {
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length - 1);
        const stdDev = Math.sqrt(variance);
        sharpeRatio = stdDev !== 0 ? meanReturn / stdDev : 0;
    }

    const totalTrades = totalWins + totalLosses;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 100 : 0;

    return {
        totalTrades,
        winRate: roundTwo(winRate),
        maxDrawdown: roundTwo(maxDrawdown * 100),
        sharpeRatio: roundTwo(sharpeRatio),
        profitFactor: roundTwo(profitFactor),
        equityCurve,
        benchmarks: {
            winRate: roundTwo(winRateTarget),
            profitFactor: pfTarget,
            maxDrawdown: ddTarget,
            sharpeRatio: 1.5
        }
    };
};
