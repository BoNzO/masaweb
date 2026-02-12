import { useState, useEffect } from 'react';
import type { Config, MasaPlan, MasaEvent, EventDetail } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';
import { calculateStake, getRescueSuggestion } from '../utils/masaLogic';

export const useMasaniello = () => {
    const [config, setConfig] = useState<Config>(() => {
        const saved = localStorage.getItem('masa_config');
        const defaultConfig: Config = {
            initialCapital: 1000,
            quota: 3.0,
            totalEvents: 13,
            expectedWins: 3,
            accumulationPercent: 50,
            weeklyTargetPercentage: 20,
            milestoneBankPercentage: 20,
            stopLossPercentage: 100,
        };
        return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    });

    const [currentPlan, setCurrentPlan] = useState<MasaPlan | null>(() => {
        const saved = localStorage.getItem('masa_current_plan');
        return saved ? JSON.parse(saved) : null;
    });

    const [history, setHistory] = useState<MasaPlan[]>(() => {
        const saved = localStorage.getItem('masa_history');
        return saved ? JSON.parse(saved) : [];
    });

    const [activeRules, setActiveRules] = useState<string[]>(() => {
        const saved = localStorage.getItem('masa_active_rules');
        return saved ? JSON.parse(saved) : [
            'first_win',
            'back_positive',
            'profit_90',
            'all_wins',
            'impossible',
            'auto_bank_100',
            'smart_auto_close',
            'profit_milestone',
            'stop_loss',
        ];
    });

    const [sequence, setSequence] = useState<EventDetail[]>([]);
    const [isSequenceActive, setIsSequenceActive] = useState(false);

    useEffect(() => {
        localStorage.setItem('masa_config', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        localStorage.setItem('masa_current_plan', JSON.stringify(currentPlan));
    }, [currentPlan]);

    useEffect(() => {
        localStorage.setItem('masa_history', JSON.stringify(history));
    }, [history]);

    useEffect(() => {
        localStorage.setItem('masa_active_rules', JSON.stringify(activeRules));
    }, [activeRules]);

    const toggleRule = (ruleId: string) => {
        setActiveRules((prev) =>
            prev.includes(ruleId)
                ? prev.filter((id) => id !== ruleId)
                : [...prev, ruleId]
        );
    };


    const createNewPlan = (startCapital: number | null = null): MasaPlan => {
        const capital = startCapital !== null ? startCapital : config.initialCapital;
        const maxProfit = calculateMaxNetProfit(
            capital,
            config.totalEvents,
            config.expectedWins,
            config.quota
        );
        return {
            id: Date.now(),
            startCapital: capital,
            currentCapital: capital,
            targetCapital: capital + maxProfit,
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
            generationNumber: currentPlan ? (currentPlan.generationNumber || 0) + 1 : 0,
        };
    };

    const startNewPlan = () => {
        setCurrentPlan(createNewPlan());
    };

    const transitionToNextPlan = (closingPlan: MasaPlan, reason: string, ruleId: string | null) => {
        let amountToBank = 0;
        let milestonesBanked = 0;
        const cycleProfit = roundTwo(closingPlan.currentCapital - closingPlan.startCapital);

        if (reason === 'auto_bank_100' && config.accumulationPercent > 0 && cycleProfit > 0) {
            const bankedMilestoneCountBefore = history.reduce(
                (acc, p) => acc + (p.milestonesBanked || (p.status === 'auto_bank_100' ? 1 : 0)),
                0
            );
            const totalBankedSoFar = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
            let absoluteStartCap = config.initialCapital;
            if (history.length > 0) absoluteStartCap = history[0].startCapital;

            const currentTotalProfit = roundTwo(closingPlan.currentCapital + totalBankedSoFar - absoluteStartCap);
            const targetValue = (config.weeklyTargetPercentage / 100) * (closingPlan.startCapital || config.initialCapital);
            const targetMilestoneCount = Math.floor(currentTotalProfit / targetValue);
            const milestonesToBankNow = Math.max(0, targetMilestoneCount - bankedMilestoneCountBefore);

            if (milestonesToBankNow > 0) {
                const theoreticalAmount = milestonesToBankNow * targetValue * (config.accumulationPercent / 100);
                amountToBank = Math.min(cycleProfit, roundTwo(theoreticalAmount));
                milestonesBanked = milestonesToBankNow;
            }
        }

        let currentMilestone = 0;
        if (reason === 'profit_milestone' && cycleProfit > 0) {
            const totalBankedSoFar = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
            let absoluteStartCap = config.initialCapital;
            if (history.length > 0) absoluteStartCap = history[0].startCapital;
            const totalWorth = closingPlan.currentCapital + totalBankedSoFar;
            currentMilestone = Math.floor(totalWorth / config.initialCapital);
            const currentTotalProfit = roundTwo(totalWorth - absoluteStartCap);
            amountToBank = roundTwo(currentTotalProfit * (config.milestoneBankPercentage / 100));
        }

        const nextCapital = roundTwo(closingPlan.currentCapital - amountToBank);
        const closedPlanWithStats: MasaPlan = {
            ...closingPlan,
            status: reason,
            triggeredRule: ruleId,
            accumulatedAmount: amountToBank,
            milestonesBanked: milestonesBanked,
            profitMilestoneReached: currentMilestone > 0 ? currentMilestone : undefined,
        };

        setHistory([...history, closedPlanWithStats]);
        setCurrentPlan(createNewPlan(nextCapital));
    };

    const finalizeSequence = (finalSequence: EventDetail[], planState: MasaPlan) => {
        let isFullWin = false;
        let isFullLoss = false;
        let isVoid = false;

        if (finalSequence.length === 1) {
            isFullWin = finalSequence[0].isWin;
            isFullLoss = !isFullWin;
        } else {
            const r1 = finalSequence[0].isWin;
            const r2 = finalSequence[1].isWin;
            if (r1 && r2) isFullWin = true;
            else if (!r1 && !r2) isFullLoss = true;
            else isVoid = true;
        }

        const totalStake = finalSequence.reduce((acc, step) => acc + step.stake, 0);
        const nextEventsLeft = isVoid ? planState.remainingEvents : planState.remainingEvents - 1;
        let nextWinsLeft = planState.remainingWins;
        if (isFullWin) nextWinsLeft -= 1;

        const nextTotalWins = isFullWin ? planState.wins + 1 : planState.wins;
        const nextTotalLosses = isFullLoss ? planState.losses + 1 : planState.losses;
        const startCap = roundTwo(planState.startCapital);
        const isCurrentlyNegative = planState.currentCapital < startCap - 0.01;
        const wasNegativePersistent = planState.wasNegative || isCurrentlyNegative;

        const newEvent: MasaEvent = {
            id: planState.events.filter((e) => !e.isSystemLog).length + 1,
            stake: totalStake,
            isWin: isFullWin,
            isVoid: isVoid,
            isPartialSequence: finalSequence.length > 1,
            sequenceDetails: finalSequence,
            capitalAfter: planState.currentCapital,
            eventsLeft: nextEventsLeft,
            winsLeft: nextWinsLeft,
            timestamp: new Date().toISOString(),
            quota: planState.quota,
        };

        const finalPlan: MasaPlan = {
            ...planState,
            events: [...planState.events, newEvent],
            remainingEvents: nextEventsLeft,
            remainingWins: nextWinsLeft,
            wins: nextTotalWins,
            losses: nextTotalLosses,
            wasNegative: wasNegativePersistent,
        };

        setSequence([]);
        setIsSequenceActive(false);

        if (!isVoid) {
            const totalBankedSoFar = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
            let absoluteStartCap = config.initialCapital;
            if (history.length > 0) absoluteStartCap = history[0].startCapital;
            else absoluteStartCap = finalPlan.startCapital;

            const currentTotalProfit = roundTwo(finalPlan.currentCapital + totalBankedSoFar - absoluteStartCap);
            const bankedMilestoneCount = history.reduce((acc, p) => acc + (p.milestonesBanked || (p.status === 'auto_bank_100' ? 1 : 0)), 0);
            const targetValue = (config.weeklyTargetPercentage / 100) * (currentPlan?.startCapital || config.initialCapital);
            const targetMilestoneCount = Math.floor(currentTotalProfit / targetValue);
            const cycleProfit = finalPlan.currentCapital - finalPlan.startCapital;

            if (activeRules.includes('auto_bank_100') && targetMilestoneCount > bankedMilestoneCount && targetValue > 0 && isFullWin && cycleProfit > 0.01) {
                transitionToNextPlan(finalPlan, 'auto_bank_100', 'auto_bank_100');
                return;
            }

            const vinit = config.initialCapital;
            const vcurr = finalPlan.currentCapital;
            const totalWorth = vcurr + totalBankedSoFar;
            const currentMilestoneIndex = Math.floor(totalWorth / vinit);
            const maxMilestoneInHistory = history.reduce((max, p) => Math.max(max, p.profitMilestoneReached || 0), 1);

            if (activeRules.includes('profit_milestone') && currentMilestoneIndex > maxMilestoneInHistory) {
                transitionToNextPlan(finalPlan, 'profit_milestone', 'profit_milestone');
                return;
            }

            if (activeRules.includes('impossible') && (nextEventsLeft < nextWinsLeft || (nextEventsLeft === 0 && nextWinsLeft > 0))) {
                finalPlan.status = 'failed';
                finalPlan.triggeredRule = 'impossible';
                setHistory([...history, finalPlan]);
                setCurrentPlan(null);
                return;
            }

            if (activeRules.includes('first_win') && !finalPlan.isRescued && isFullWin && planState.losses === 0) {
                transitionToNextPlan(finalPlan, 'first_win_close', 'first_win');
                return;
            }
            if (activeRules.includes('back_positive') && !finalPlan.isRescued && planState.wasNegative && planState.currentCapital >= startCap - 0.01) {
                transitionToNextPlan(finalPlan, 'back_positive_close', 'back_positive');
                return;
            }
            const profitMade = planState.currentCapital - startCap;
            if (activeRules.includes('profit_90') && !finalPlan.isRescued && profitMade >= planState.maxNetProfit * 0.9) {
                transitionToNextPlan(finalPlan, 'profit_90_reset', 'profit_90');
                return;
            }
            if (activeRules.includes('all_wins') && nextWinsLeft === 0) {
                // If rescued but still in loss relative to THIS cycle's start, don't auto-close.
                if (!(finalPlan.isRescued && finalPlan.currentCapital < finalPlan.startCapital - 0.01)) {
                    transitionToNextPlan(finalPlan, 'completed', 'all_wins');
                    return;
                }
            }

            const eventsPlayed = finalPlan.totalEvents - nextEventsLeft;
            const progressPercent = eventsPlayed / finalPlan.totalEvents;
            const capitalRetention = finalPlan.currentCapital / finalPlan.startCapital;
            if (activeRules.includes('smart_auto_close') && !finalPlan.isRescued && progressPercent > 0.65 && capitalRetention > 0.90) {
                transitionToNextPlan(finalPlan, 'smart_auto_close', 'smart_auto_close');
                return;
            }

            const drawdown = (finalPlan.startCapital - finalPlan.currentCapital) / finalPlan.startCapital;
            if (activeRules.includes('stop_loss') && drawdown >= config.stopLossPercentage / 100) {
                transitionToNextPlan(finalPlan, 'stop_loss_triggered', 'stop_loss');
                return;
            }
        }
        setCurrentPlan(finalPlan);
    };

    const getNextStake = (customQuota?: number) => {
        if (!currentPlan || currentPlan.status !== 'active') return 0;
        return calculateStake(
            currentPlan.currentCapital,
            currentPlan.remainingEvents,
            currentPlan.remainingWins,
            currentPlan.quota,
            currentPlan.targetCapital,
            customQuota
        );
    };

    const handlePartialStep = (isWin: boolean, customQuota?: number) => {
        if (!currentPlan) return;
        const activeQuota = customQuota || currentPlan.quota;
        const fullStake = getNextStake(activeQuota);
        const halfStake = roundTwo(fullStake / 2);
        const stakeToUse = sequence.length === 0 ? halfStake : sequence[0].stake;
        const netResult = isWin ? stakeToUse * (activeQuota - 1) : -stakeToUse;
        const newStep: EventDetail = { stake: stakeToUse, isWin, netResult };
        const newSequence = [...sequence, newStep];
        const intermediateCapital = roundTwo(currentPlan.currentCapital + netResult);
        const tempPlan: MasaPlan = { ...currentPlan, currentCapital: intermediateCapital };

        if (newSequence.length === 2) {
            finalizeSequence(newSequence, tempPlan);
        } else {
            setSequence(newSequence);
            setIsSequenceActive(true);
            setCurrentPlan(tempPlan);
        }
    };

    const handleFullBet = (isWin: boolean, customQuota?: number) => {
        if (!currentPlan) return;
        const activeQuota = customQuota || currentPlan.quota;
        const fullStake = getNextStake(activeQuota);
        const netResult = isWin ? fullStake * (activeQuota - 1) : -fullStake;
        const newCapital = roundTwo(currentPlan.currentCapital + netResult);
        const fullSequence = [{ stake: fullStake, isWin, netResult }];
        const tempPlan = { ...currentPlan, currentCapital: newCapital };
        finalizeSequence(fullSequence, tempPlan);
    };


    const activateRescueMode = (eventsToAdd: number, customTarget?: number, winsToAdd: number = 0, extraCapital: number = 0) => {
        if (!currentPlan) return;

        const injected = Number(extraCapital);
        const newCapital = roundTwo(currentPlan.currentCapital + injected);

        const rescueEventLog: MasaEvent = {
            id: `RESCUE_${Date.now()}`,
            stake: 0,
            isWin: false,
            isVoid: true,
            isPartialSequence: false,
            isSystemLog: true,
            message: `SALVAGENTE 2.0: +${eventsToAdd}E ${winsToAdd > 0 ? `+${winsToAdd}V` : ''}${injected > 0 ? ` (+€${injected} Refill)` : ''}${customTarget ? ' | Target BE' : ''}`,
            capitalAfter: newCapital,
            eventsLeft: currentPlan.remainingEvents + eventsToAdd,
            winsLeft: currentPlan.remainingWins + winsToAdd,
            timestamp: new Date().toISOString(),
            quota: currentPlan.quota
        };

        const newTarget = customTarget || (
            newCapital < currentPlan.startCapital
                ? currentPlan.startCapital
                : (newCapital + calculateMaxNetProfit(
                    newCapital,
                    currentPlan.remainingEvents + eventsToAdd,
                    currentPlan.remainingWins + winsToAdd,
                    currentPlan.quota
                ))
        );

        const newProfit = newTarget - newCapital;

        setCurrentPlan({
            ...currentPlan,
            currentCapital: newCapital,
            totalEvents: currentPlan.totalEvents + eventsToAdd,
            remainingEvents: currentPlan.remainingEvents + eventsToAdd,
            expectedWins: currentPlan.expectedWins + winsToAdd,
            remainingWins: currentPlan.remainingWins + winsToAdd,
            targetCapital: newTarget,
            maxNetProfit: newProfit,
            isRescued: true,
            events: [...currentPlan.events, rescueEventLog],
        });
    };

    const resetAll = () => {
        setHistory([]);
        setCurrentPlan(null);
        setSequence([]);
        setIsSequenceActive(false);
    };

    return {
        config,
        setConfig,
        currentPlan,
        setCurrentPlan,
        history,
        setHistory,
        activeRules,
        toggleRule,
        sequence,
        isSequenceActive,
        startNewPlan,
        handleFullBet,
        handlePartialStep,
        activateRescueMode,
        resetAll,
        transitionToNextPlan,
        getNextStake,
        getRescueSuggestion: (extraCap?: number) => getRescueSuggestion(currentPlan, extraCap),
    };
};
