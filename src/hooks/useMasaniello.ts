import { useState, useEffect } from 'react';
import type { Config, MasaPlan, MasaEvent, EventSnapshot } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';
import { calculateStake, getRescueSuggestion } from '../utils/masaLogic';

const getNYTime = () => {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date()).replace(',', '');
};

export const useMasaniello = (persist: boolean = true, onFeedTriggered?: (amount: number) => void, onBufferUpdate?: (newBuffer: number) => void) => {
    const [config, setConfig] = useState<Config>(() => {
        if (!persist) {
            return {
                initialCapital: 1000,
                quota: 3.0,
                totalEvents: 13,
                expectedWins: 3,
                accumulationPercent: 50,
                weeklyTargetPercentage: 20,
                milestoneBankPercentage: 20
            };
        }
        const saved = localStorage.getItem('masa_config');
        const defaultConfig: Config = {
            initialCapital: 1000,
            quota: 3.0,
            totalEvents: 13,
            expectedWins: 3,
            accumulationPercent: 50,
            weeklyTargetPercentage: 20,
            milestoneBankPercentage: 20,
            checklistTemplate: [
                'Trend H1/H4 allineato?',
                'Ho raggiunto un PD Array > H4?',
                'News ad alto impatto evitate?',
                'Ho controllato che prima del target non ci siano altri PD Array su HTF?'
            ]
        };
        return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    });

    const [plans, setPlans] = useState<Record<string, MasaPlan>>(() => {
        if (!persist) return {};
        const saved = localStorage.getItem('masa_plans');
        // Migration: If old 'masa_current_plan' exists, convert it to the new structure
        if (!saved) {
            const oldPlan = localStorage.getItem('masa_current_plan');
            if (oldPlan) {
                const parsed = JSON.parse(oldPlan);
                return { [parsed.id]: parsed };
            }
            return {};
        }
        return JSON.parse(saved);
    });

    const [activePlanId, setActivePlanId] = useState<string | null>(() => {
        if (!persist) return null;
        const saved = localStorage.getItem('masa_active_plan_id');
        if (saved) return JSON.parse(saved);
        // Fallback: use key of first plan if exists
        const planKeys = Object.keys(JSON.parse(localStorage.getItem('masa_plans') || '{}'));
        return planKeys.length > 0 ? planKeys[0] : null;
    });

    const currentPlan = activePlanId && plans[activePlanId] ? plans[activePlanId] : null;

    const setCurrentPlan = (plan: MasaPlan | null) => {
        if (plan) {
            setPlans(prev => ({ ...prev, [plan.id]: plan }));
            if (!activePlanId) setActivePlanId(String(plan.id));
        } else if (activePlanId) {
            // If null is passed, it implies removing or archiving the current plan? 
            // For now, let's keep the old behavior of "resetting" current context, 
            // but in a tree view we might just want to set status to 'completed'.
            // For backward compatibility with 'resetAll', we clear the plan from dictionary.
            setPlans(prev => {
                const newPlans = { ...prev };
                delete newPlans[activePlanId];
                return newPlans;
            });
            setActivePlanId(null);
        }
    };

    const [history, setHistory] = useState<MasaPlan[]>(() => {
        if (!persist) return [];
        const saved = localStorage.getItem('masa_history');
        return saved ? JSON.parse(saved) : [];
    });

    const [activeRules, setActiveRules] = useState<string[]>(() => {
        if (!persist) return [];
        const saved = localStorage.getItem('masa_active_rules');
        return saved ? JSON.parse(saved) : [];
    });



    useEffect(() => {
        if (persist) localStorage.setItem('masa_config', JSON.stringify(config));
    }, [config, persist]);

    useEffect(() => {
        if (persist) localStorage.setItem('masa_plans', JSON.stringify(plans));
    }, [plans, persist]);

    useEffect(() => {
        if (persist) localStorage.setItem('masa_active_plan_id', JSON.stringify(activePlanId));
    }, [activePlanId, persist]);

    useEffect(() => {
        if (persist) localStorage.setItem('masa_history', JSON.stringify(history));
    }, [history, persist]);

    useEffect(() => {
        if (persist) localStorage.setItem('masa_active_rules', JSON.stringify(activeRules));
    }, [activeRules, persist]);

    const toggleRule = (ruleId: string) => {
        setActiveRules((prev) =>
            prev.includes(ruleId)
                ? prev.filter((id) => id !== ruleId)
                : [...prev, ruleId]
        );
    };

    const toggleAllRules = (allRuleIds: string[]) => {
        setActiveRules((prev) => {
            const areAllActive = allRuleIds.every(id => prev.includes(id));
            return areAllActive ? [] : allRuleIds;
        });
    };

    const savePlan = (plan: MasaPlan) => {
        setCurrentPlan(plan);
        // LocalStorage update is handled by useEffect [currentPlan]
    };


    const createNewPlan = (startCapital: number | null = null, parentId: number | null = null, generation: number | null = null, configOverrides: Partial<Config> = {}, parentPlan?: MasaPlan): MasaPlan => {
        const effectiveConfig = { ...config, ...configOverrides };

        // For Slave plans, use the virtualBuffer as the capital source
        let capital: number;
        if (effectiveConfig.role === 'slave' && effectiveConfig.feedSource) {
            capital = effectiveConfig.feedSource.virtualBuffer || 0;
        } else {
            capital = startCapital !== null ? startCapital : effectiveConfig.initialCapital;
        }

        const maxProfit = calculateMaxNetProfit(
            capital,
            effectiveConfig.totalEvents,
            effectiveConfig.expectedWins,
            effectiveConfig.quota,
            effectiveConfig.maxConsecutiveLosses
        );
        return {
            id: Date.now(),
            startCapital: capital,
            currentCapital: capital,
            targetCapital: capital + maxProfit,
            // Calculate initial target based on START capital of this plan
            // ABSOLUTE TARGET: Capital to reach (e.g. 1000 + 20% = 1200)
            currentWeeklyTarget: capital * (1 + effectiveConfig.weeklyTargetPercentage / 100),
            maxNetProfit: maxProfit,
            quota: effectiveConfig.quota,
            totalEvents: effectiveConfig.totalEvents,
            expectedWins: effectiveConfig.expectedWins,
            events: [],
            remainingEvents: effectiveConfig.totalEvents,
            remainingWins: effectiveConfig.expectedWins,
            wins: 0,
            losses: 0,
            status: 'active',
            triggeredRule: null,
            wasNegative: false,
            accumulatedAmount: 0,
            isRescued: false,
            createdAt: new Date().toISOString(),
            generationNumber: generation !== null ? generation : (currentPlan ? (currentPlan.generationNumber || 0) + 1 : 0),
            maxConsecutiveLosses: effectiveConfig.maxConsecutiveLosses,
            currentConsecutiveLosses: 0,
            parentId: parentId,
            childrenIds: [],
            treeStatus: 'active',
            tags: [],
            // Inherit milestone tracking from parent plan to avoid re-triggering rules immediately
            profitMilestoneReached: parentPlan?.profitMilestoneReached || 0,
            milestonesBanked: parentPlan?.milestonesBanked || 0,
            lastUsedPair: parentPlan?.lastUsedPair || '',
            weeklyTargetsReached: 0,
            startWeeklyBaseline: capital,
            role: effectiveConfig.role,
            feedForwardConfig: effectiveConfig.feedForwardConfig,
            feedSource: effectiveConfig.feedSource
        };
    };

    const startNewPlan = () => {
        const newPlan = createNewPlan();
        setCurrentPlan(newPlan);
    };

    const transitionToNextPlan = (closingPlan: MasaPlan, reason: string, ruleId: string | null) => {
        let amountToBank = 0;
        let milestonesBanked = 0;
        const cycleProfit = roundTwo(closingPlan.currentCapital - closingPlan.startCapital);

        // 1. Weekly Target (Auto Bank 100) - PLAN LOCAL
        if (reason === 'auto_bank_100') {
            // Simple rule: Bank % of CURRENT cycle profit
            if (config.accumulationPercent > 0 && cycleProfit > 0) {
                amountToBank = roundTwo(cycleProfit * (config.accumulationPercent / 100));
            }
        }

        // 2. Profit Milestone (Global)
        let currentMilestone = 0;
        if (reason === 'profit_milestone') {
            const totalBankedSoFar = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
            let absoluteStartCap = config.initialCapital;
            if (history.length > 0) absoluteStartCap = history[0].startCapital;

            const totalWorth = closingPlan.currentCapital + totalBankedSoFar;
            const milestoneBase = config.initialCapital > 0 ? config.initialCapital : 1000;
            currentMilestone = Math.floor(totalWorth / milestoneBase);

            if (cycleProfit > 0) {
                // Calculate theoretical amount based on GLOBAL profit increment
                const currentTotalProfit = roundTwo(totalWorth - absoluteStartCap);
                const theoreticalAmount = roundTwo(currentTotalProfit * (config.milestoneBankPercentage / 100));

                // Safety: Cap banking at 50% of current available capital to avoid bankrupting the active plan
                amountToBank = Math.min(theoreticalAmount, roundTwo(closingPlan.currentCapital * 0.5));
            }
        }

        // 3. End of Cycle Banking (Target Reached / Manual Close with Profit)
        const isEndCondition = reason === 'manual_close' || reason === 'completed' || reason === 'target_reached' || reason === 'rescue_target_reached';
        if (isEndCondition && config.accumulationPercent > 0 && cycleProfit > 0) {
            // Bank configured % of the cycle profit
            amountToBank = roundTwo(cycleProfit * (config.accumulationPercent / 100));
        }

        let nextCapital = roundTwo(closingPlan.currentCapital - amountToBank);

        // 4. Feed Forward to Slave (on closure)
        if (closingPlan.role === 'master' && closingPlan.feedForwardConfig && cycleProfit > 0) {
            const feedPercentage = closingPlan.feedForwardConfig.percentage;
            // The profit we are actually sharing is the net profit of this cycle
            // remaining after internal banking (which is the portion that will stay in the next cycle)
            const shareableProfit = roundTwo(cycleProfit - amountToBank);
            const feedAmount = roundTwo(shareableProfit * (feedPercentage / 100));

            console.log('🔍 FEED CALCULATION DEBUG:', {
                cycleProfit,
                amountToBank,
                shareableProfit,
                feedPercentage,
                feedAmount,
                currentCapital: closingPlan.currentCapital,
                startCapital: closingPlan.startCapital
            });

            if (feedAmount > 0) {
                if (onFeedTriggered) onFeedTriggered(feedAmount);
                nextCapital = roundTwo(nextCapital - feedAmount);

                const newTotalFed = roundTwo((closingPlan.feedForwardConfig.totalFed || 0) + feedAmount);

                // Update global config totalFed
                setConfig(prev => ({
                    ...prev,
                    feedForwardConfig: {
                        ...(prev.feedForwardConfig || { percentage: 50, totalFed: 0 }),
                        totalFed: newTotalFed
                    }
                }));

                // Update the current plan object we are about to close so history reflects the feed
                closingPlan.feedForwardConfig = {
                    ...closingPlan.feedForwardConfig,
                    totalFed: newTotalFed
                };
            }
        }

        // Add Banking Log directly to the plan events before closing
        let finalEvents = [...closingPlan.events];
        if (amountToBank > 0) {
            finalEvents.push({
                id: `BANKING_${Date.now()}`,
                stake: 0,
                isWin: false,
                isVoid: true,
                isPartialSequence: false,
                isSystemLog: true,
                message: `BANKING: Accantonati €${amountToBank} (${config.accumulationPercent}%)`,
                capitalAfter: closingPlan.currentCapital, // Capital doesn't decrease in plan, but is removed from *next* start
                eventsLeft: closingPlan.remainingEvents,
                winsLeft: closingPlan.remainingWins,
                timestamp: new Date().toISOString(),
                quota: closingPlan.quota,
                snapshot: createSnapshot(closingPlan)
            });
        }

        // Add Feed Forward Log if it happened
        if (closingPlan.role === 'master' && closingPlan.feedForwardConfig && cycleProfit > 0) {
            const shareableProfit = roundTwo(cycleProfit - amountToBank);
            const feedAmount = roundTwo(shareableProfit * (closingPlan.feedForwardConfig.percentage / 100));
            if (feedAmount > 0) {
                finalEvents.push({
                    id: `FEED_${Date.now()}`,
                    stake: 0,
                    isWin: false,
                    isVoid: true,
                    isPartialSequence: false,
                    isSystemLog: true,
                    message: `FEED FORWARD: Inviati €${feedAmount} allo Slave (${closingPlan.feedForwardConfig.percentage}%)`,
                    capitalAfter: closingPlan.currentCapital,
                    eventsLeft: closingPlan.remainingEvents,
                    winsLeft: closingPlan.remainingWins,
                    timestamp: new Date().toISOString(),
                    quota: closingPlan.quota,
                    snapshot: createSnapshot(closingPlan),
                    feedAmount: feedAmount
                });
            }
        }

        const closedPlanWithStats: MasaPlan = {
            ...closingPlan,
            events: finalEvents,
            status: reason,
            treeStatus: 'completed',
            triggeredRule: ruleId,
            weeklyTargetsReached: (closingPlan.weeklyTargetsReached || 0) + (
                reason === 'auto_bank_100' ||
                    (closingPlan.currentWeeklyTarget && closingPlan.currentCapital >= closingPlan.currentWeeklyTarget - 0.01) ? 1 : 0
            ),
            accumulatedAmount: amountToBank,
            milestonesBanked: milestonesBanked,
            // Critical: Preserve previous High Water Mark if not currently updating it
            profitMilestoneReached: (reason === 'profit_milestone' && currentMilestone > 0)
                ? currentMilestone
                : (closingPlan.profitMilestoneReached || 0),
        };

        // Update the closed plan in history/storage
        setPlans(prev => ({ ...prev, [closedPlanWithStats.id]: closedPlanWithStats }));

        // Add to history list (SAFER with functional update)
        setHistory(prev => [...prev, closedPlanWithStats]);

        // Create next plan linked to this one
        // Create next plan linked to this one
        const nextPlan = createNewPlan(
            nextCapital,
            closedPlanWithStats.id,
            closedPlanWithStats.generationNumber + 1,
            {
                feedForwardConfig: closedPlanWithStats.feedForwardConfig
            },
            closedPlanWithStats
        );

        // WEEKLY TARGET PERSISTENCE:
        // Check if the target was actually met in the plan we just closed
        const targetWasMet = (closedPlanWithStats.weeklyTargetsReached || 0) > (closingPlan.weeklyTargetsReached || 0);

        if (!targetWasMet && closingPlan.currentWeeklyTarget) {
            // Target not reached yet: carry over the baseline and the target to the next plan (generation)
            nextPlan.currentWeeklyTarget = closingPlan.currentWeeklyTarget;
            nextPlan.startWeeklyBaseline = closingPlan.startWeeklyBaseline;
        } else {
            // Target was reached: next plan starts a fresh weekly cycle
            nextPlan.startWeeklyBaseline = nextPlan.startCapital;
            nextPlan.currentWeeklyTarget = nextPlan.startCapital * (1 + config.weeklyTargetPercentage / 100);
        }

        // Update closed plan to point to child
        setPlans(prev => ({
            ...prev,
            [closedPlanWithStats.id]: {
                ...closedPlanWithStats,
                childrenIds: [...(closedPlanWithStats.childrenIds || []), nextPlan.id]
            },
            [nextPlan.id]: nextPlan
        }));

        setActivePlanId(String(nextPlan.id));
    };

    const createSnapshot = (plan: MasaPlan): EventSnapshot => {
        return {
            config: { ...config },
            activeRules: [...activeRules],
            isRescued: plan.isRescued,
            currentConsecutiveLosses: plan.currentConsecutiveLosses || 0,
            maxConsecutiveLosses: plan.maxConsecutiveLosses,
            suggestedStake: getNextStake(plan.quota),
            targetCapital: plan.targetCapital
        };
    };



    const checkPlanStatus = (planState: MasaPlan) => {
        const prevCapital = currentPlan?.currentCapital || planState.startCapital;
        const isGrowth = planState.currentCapital > prevCapital + 0.001;

        // 1. Max Consecutive Losses
        if (planState.maxConsecutiveLosses && planState.maxConsecutiveLosses > 0 &&
            planState.currentConsecutiveLosses && planState.currentConsecutiveLosses > planState.maxConsecutiveLosses) {
            const failedPlan = { ...planState, status: 'failed', triggeredRule: 'max_losses' };
            setHistory([...history, failedPlan]);
            setCurrentPlan(null);
            return;
        }

        const startCap = roundTwo(planState.startCapital);

        // 2. First Win Rule
        if (activeRules.includes('first_win') && planState.wins > (currentPlan?.wins || 0) && planState.losses === 0) {
            transitionToNextPlan(planState, 'first_win_close', 'first_win');
            return;
        }

        // 3. Back Positive Rule
        if (activeRules.includes('back_positive') && currentPlan?.wasNegative && planState.currentCapital >= startCap - 0.01) {
            transitionToNextPlan(planState, 'back_positive_close', 'back_positive');
            return;
        }

        // 4. Profit 90% Rule
        const profitMade = planState.currentCapital - startCap;
        if (activeRules.includes('profit_90') && isGrowth && profitMade >= planState.maxNetProfit * 0.9) {
            transitionToNextPlan(planState, 'profit_90_reset', 'profit_90');
            return;
        }

        // 5. All Wins (Completed)
        if (planState.remainingWins <= 0) {
            const isRescueNegative = planState.isRescued && planState.currentCapital < startCap - 0.01;

            if (!isRescueNegative) {
                transitionToNextPlan(planState, 'completed', 'all_wins');
                return;
            }
        }


        // 7. Rescue Target Reached
        if (planState.isRescued) {
            const recoveryRatio = planState.currentCapital / startCap;
            if (recoveryRatio >= 0.90) {
                transitionToNextPlan(planState, 'rescue_target_reached', 'rescue_target_reached');
                return;
            }
        }

        // 8. Weekly Target (Auto Bank 100 or Auto Rollover)
        const absoluteTarget = planState.currentWeeklyTarget ?? (planState.startCapital * (1 + config.weeklyTargetPercentage / 100));

        if (config.weeklyTargetPercentage > 0 && isGrowth && planState.currentCapital >= absoluteTarget && (planState.currentCapital - planState.startCapital) > 0) {
            if (activeRules.includes('auto_bank_100')) {
                // Rule active: Close and Bank (History count will handle this)
                transitionToNextPlan(planState, 'auto_bank_100', 'auto_bank_100');
                return;
            } else {
                // Rule NOT active: Just rollover and increment counter in place
                const newTarget = planState.currentCapital * (1 + config.weeklyTargetPercentage / 100);
                const updatedPlan = {
                    ...planState,
                    weeklyTargetsReached: (planState.weeklyTargetsReached || 0) + 1,
                    startWeeklyBaseline: planState.currentCapital,
                    currentWeeklyTarget: newTarget,
                    events: [
                        ...planState.events,
                        {
                            id: `TARGET_ROLLOVER_${Date.now()}`,
                            stake: 0,
                            isWin: false,
                            isVoid: true,
                            isPartialSequence: false,
                            isSystemLog: true,
                            message: `TARGET RAGGIUNTO: +20% | Nuovo Target: €${newTarget.toFixed(2)}`,
                            capitalAfter: planState.currentCapital,
                            eventsLeft: planState.remainingEvents,
                            winsLeft: planState.remainingWins,
                            timestamp: new Date().toISOString(),
                            quota: planState.quota,
                            snapshot: createSnapshot(planState)
                        }
                    ]
                };
                setCurrentPlan(updatedPlan);
                return;
            }
        }

        // 9. Profit Milestone (Multiple of Capital)
        if (activeRules.includes('profit_milestone') && config.initialCapital > 0) {
            const totalBankedSoFar = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
            const totalWorth = planState.currentCapital + totalBankedSoFar;
            const currentMilestone = Math.floor(totalWorth / config.initialCapital);

            if (isGrowth && currentMilestone > (planState.profitMilestoneReached || 0) && currentMilestone > 0) {
                transitionToNextPlan(planState, 'profit_milestone', 'profit_milestone');
                return;
            }
        }

        // Impossible Rule (moved from finalizeSequence)
        if (activeRules.includes('impossible') && (planState.remainingEvents < planState.remainingWins || (planState.remainingEvents === 0 && planState.remainingWins > 0))) {
            const failedPlan = { ...planState, status: 'failed', triggeredRule: 'impossible' };
            setHistory([...history, failedPlan]);
            setCurrentPlan(null);
            return;
        }

        // Smart Auto Close
        const eventsPlayed = planState.totalEvents - planState.remainingEvents;
        const progressPercent = eventsPlayed / planState.totalEvents;
        const capitalRetention = planState.currentCapital / planState.startCapital;
        if (activeRules.includes('smart_auto_close') && isGrowth && progressPercent > 0.65 && capitalRetention > 0.90) {
            transitionToNextPlan(planState, 'smart_auto_close', 'smart_auto_close');
            return;
        }

        // If no termination, just update state
        setCurrentPlan(planState);
    };

    const getNextStake = (customQuota?: number) => {
        if (!currentPlan || currentPlan.status !== 'active') return 0;
        const stake = calculateStake(
            currentPlan.currentCapital,
            currentPlan.remainingEvents,
            currentPlan.remainingWins,
            customQuota || currentPlan.quota,
            currentPlan.targetCapital,
            currentPlan.maxConsecutiveLosses || 0,
            currentPlan.currentConsecutiveLosses || 0
        );

        if (currentPlan.role === 'slave' && currentPlan.feedSource) {
            return Math.min(stake, currentPlan.feedSource.virtualBuffer);
        }

        return stake;
    };

    const handlePartialWin = (activeQuota: number, pair?: string, checklistResults?: Record<string, boolean>) => {
        if (!currentPlan) return;
        const fullStake = getNextStake(activeQuota);
        const halfStake = roundTwo(fullStake / 2);
        const profit = roundTwo(halfStake * (activeQuota - 1));
        const newCapital = roundTwo(currentPlan.currentCapital + profit);

        const partialWinsCount = currentPlan.events.filter(e => e.isPartialSequence && e.isWin && !e.isVoid).length;
        const isSecondWin = (partialWinsCount + 1) % 2 === 0;

        // Masa progress only on the 2nd partial win
        const nextEventsLeft = isSecondWin ? currentPlan.remainingEvents - 1 : currentPlan.remainingEvents;
        const nextWinsLeft = isSecondWin ? Math.max(0, currentPlan.remainingWins - 1) : currentPlan.remainingWins;

        const newEvent: MasaEvent = {
            id: currentPlan.events.filter((e) => !e.isSystemLog).length + 1,
            stake: halfStake,
            isWin: true,
            isVoid: false,
            isPartialSequence: true,
            message: isSecondWin ? 'Vincita Parziale (2/2) - Vinta Completa' : 'Vincita Parziale (1/2) - In Attesa',
            capitalAfter: newCapital,
            eventsLeft: nextEventsLeft,
            winsLeft: nextWinsLeft,
            timestamp: new Date().toISOString(),
            nyTimestamp: getNYTime(),
            pair: pair || currentPlan.lastUsedPair,
            checklistResults,
            quota: activeQuota,
            snapshot: createSnapshot(currentPlan)
        };

        let updatedPlan: MasaPlan = {
            ...currentPlan,
            currentCapital: newCapital,
            events: [...currentPlan.events, newEvent],
            remainingEvents: nextEventsLeft,
            remainingWins: nextWinsLeft,
            wins: isSecondWin ? currentPlan.wins + 1 : currentPlan.wins,
            currentConsecutiveLosses: isSecondWin ? 0 : currentPlan.currentConsecutiveLosses,
            lastUsedPair: pair || currentPlan.lastUsedPair,
            maxNetProfit: currentPlan.maxNetProfit
        };

        // SLAVE BUFFER LOGIC
        if (currentPlan.role === 'slave' && currentPlan.feedSource) {
            const newBuffer = roundTwo(currentPlan.feedSource.virtualBuffer + profit);
            updatedPlan.feedSource = {
                ...currentPlan.feedSource,
                virtualBuffer: newBuffer,
                isPaused: newBuffer <= 0
            };
            if (onBufferUpdate) onBufferUpdate(newBuffer);
        }

        checkPlanStatus(updatedPlan);
    };

    const handlePartialLoss = (activeQuota: number, pair?: string, checklistResults?: Record<string, boolean>) => {
        if (!currentPlan) return;
        const fullStake = getNextStake(activeQuota);
        const halfStake = roundTwo(fullStake / 2);
        const lossAmount = halfStake;
        const newCapital = roundTwo(currentPlan.currentCapital - lossAmount);

        const partialLossesCount = currentPlan.events.filter(e => e.isPartialSequence && !e.isWin && !e.isVoid).length;
        const isSecondLoss = (partialLossesCount + 1) % 2 === 0;

        // 1st loss = Full loss progress, 2nd loss = Ignored
        const nextEventsLeft = !isSecondLoss ? currentPlan.remainingEvents - 1 : currentPlan.remainingEvents;
        const nextWinsLeft = currentPlan.remainingWins;

        const newEvent: MasaEvent = {
            id: currentPlan.events.filter((e) => !e.isSystemLog).length + 1,
            stake: halfStake,
            isWin: false,
            isVoid: false,
            isPartialSequence: true,
            message: isSecondLoss ? 'Sconfitta Parziale (2/2) - Ignorata' : 'Sconfitta Parziale (1/2) - Persa Completa',
            capitalAfter: newCapital,
            eventsLeft: nextEventsLeft,
            winsLeft: nextWinsLeft,
            timestamp: new Date().toISOString(),
            nyTimestamp: getNYTime(),
            pair: pair || currentPlan.lastUsedPair,
            checklistResults,
            quota: activeQuota,
            snapshot: createSnapshot(currentPlan)
        };

        const updatedPlan: MasaPlan = {
            ...currentPlan,
            currentCapital: newCapital,
            events: [...currentPlan.events, newEvent],
            remainingEvents: nextEventsLeft,
            losses: !isSecondLoss ? currentPlan.losses + 1 : currentPlan.losses,
            currentConsecutiveLosses: !isSecondLoss ? (currentPlan.currentConsecutiveLosses || 0) + 1 : currentPlan.currentConsecutiveLosses,
            lastUsedPair: pair || currentPlan.lastUsedPair,
            maxNetProfit: currentPlan.maxNetProfit
        };

        // SLAVE BUFFER LOGIC
        if (currentPlan.role === 'slave' && currentPlan.feedSource) {
            const newBuffer = roundTwo(currentPlan.feedSource.virtualBuffer - lossAmount);
            updatedPlan.feedSource = {
                ...currentPlan.feedSource,
                virtualBuffer: newBuffer,
                isPaused: newBuffer <= 0
            };
            if (onBufferUpdate) onBufferUpdate(newBuffer);
        }

        checkPlanStatus(updatedPlan);
    };

    const handleFullBet = (isWin: boolean, customQuota?: number, pair?: string, checklistResults?: Record<string, boolean>) => {
        if (!currentPlan) return;
        const activeQuota = customQuota || currentPlan.quota;
        const fullStake = getNextStake(activeQuota);
        const netResult = isWin ? fullStake * (activeQuota - 1) : -fullStake;
        const newCapital = roundTwo(currentPlan.currentCapital + netResult);

        const nextEventsLeft = currentPlan.remainingEvents - 1;
        const nextWinsLeft = isWin ? currentPlan.remainingWins - 1 : currentPlan.remainingWins;

        const sequenceDetail = [{ stake: fullStake, isWin, netResult }];

        const newEvent: MasaEvent = {
            id: currentPlan.events.filter((e) => !e.isSystemLog).length + 1,
            stake: fullStake,
            isWin: isWin,
            isVoid: false,
            isPartialSequence: false,
            sequenceDetails: sequenceDetail,
            capitalAfter: newCapital,
            eventsLeft: nextEventsLeft,
            winsLeft: nextWinsLeft,
            timestamp: new Date().toISOString(),
            nyTimestamp: getNYTime(),
            pair: pair || currentPlan.lastUsedPair,
            checklistResults,
            quota: activeQuota,
            snapshot: createSnapshot(currentPlan)
        };

        const updatedPlan: MasaPlan = {
            ...currentPlan,
            currentCapital: newCapital,
            events: [...currentPlan.events, newEvent],
            remainingEvents: nextEventsLeft,
            remainingWins: nextWinsLeft,
            wins: isWin ? currentPlan.wins + 1 : currentPlan.wins,
            losses: isWin ? currentPlan.losses : currentPlan.losses + 1,
            currentConsecutiveLosses: isWin ? 0 : (currentPlan.currentConsecutiveLosses || 0) + 1,
            lastUsedPair: pair || currentPlan.lastUsedPair,
            maxNetProfit: currentPlan.maxNetProfit
        };

        // REMOVED live feed forward to keep Masa math stable and feed ONLY on completion as requested

        // SLAVE BUFFER LOGIC
        if (currentPlan.role === 'slave' && currentPlan.feedSource) {
            const result = isWin ? roundTwo(fullStake * (activeQuota - 1)) : -fullStake;
            const newBuffer = roundTwo(currentPlan.feedSource.virtualBuffer + result);
            updatedPlan.feedSource = {
                ...currentPlan.feedSource,
                virtualBuffer: Math.max(0, newBuffer),
                isPaused: newBuffer <= 0
            };
            if (onBufferUpdate) onBufferUpdate(Math.max(0, newBuffer));
        }

        checkPlanStatus(updatedPlan);
    };

    const handleBreakEven = () => {
        if (!currentPlan) return;
        const beEvent: MasaEvent = {
            id: currentPlan.events.filter((e) => !e.isSystemLog).length + 1,
            stake: 0,
            isWin: false,
            isVoid: true,
            isPartialSequence: false,
            capitalAfter: currentPlan.currentCapital,
            eventsLeft: currentPlan.remainingEvents,
            winsLeft: currentPlan.remainingWins,
            timestamp: new Date().toISOString(),
            quota: currentPlan.quota,
            message: 'BREAK EVEN',
            snapshot: createSnapshot(currentPlan)
        };

        setCurrentPlan({
            ...currentPlan,
            events: [...currentPlan.events, beEvent],
        });
    };

    const handleAdjustment = (amount: number, isWinEquivalent: boolean) => {
        if (!currentPlan) return;
        const adjCapital = roundTwo(currentPlan.currentCapital + amount);
        const adjEvent: MasaEvent = {
            id: currentPlan.events.filter((e) => !e.isSystemLog).length + 1,
            stake: Math.abs(amount),
            isWin: isWinEquivalent,
            isVoid: false,
            isPartialSequence: false,
            capitalAfter: adjCapital,
            eventsLeft: currentPlan.remainingEvents - 1,
            winsLeft: isWinEquivalent ? Math.max(0, currentPlan.remainingWins - 1) : currentPlan.remainingWins,
            timestamp: new Date().toISOString(),
            quota: currentPlan.quota,
            message: amount >= 0 ? `USCITA PARZIALE (+€${amount})` : `PERDITA PARZIALE (-€${Math.abs(amount)})`,
            snapshot: createSnapshot(currentPlan)
        };

        setCurrentPlan({
            ...currentPlan,
            currentCapital: adjCapital,
            remainingEvents: currentPlan.remainingEvents - 1,
            remainingWins: isWinEquivalent ? Math.max(0, currentPlan.remainingWins - 1) : currentPlan.remainingWins,
            wins: isWinEquivalent ? currentPlan.wins + 1 : currentPlan.wins,
            losses: isWinEquivalent ? currentPlan.losses : currentPlan.losses + 1,
            events: [...currentPlan.events, adjEvent],
            currentConsecutiveLosses: isWinEquivalent ? 0 : (currentPlan.currentConsecutiveLosses || 0) + 1
        });
    };


    const activateRescueMode = (eventsToAdd: number, customTarget?: number, winsToAdd: number = 0, extraCapital: number = 0, newMaxLosses?: number) => {
        if (!currentPlan) return;

        const injected = Number(extraCapital);
        const newCapital = roundTwo(currentPlan.currentCapital + injected);
        const effectiveMaxLosses = newMaxLosses !== undefined ? newMaxLosses : (currentPlan.maxConsecutiveLosses || 0);

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
            quota: currentPlan.quota,
            snapshot: createSnapshot(currentPlan)
        };

        const newTarget = customTarget || (
            newCapital < currentPlan.startCapital
                ? currentPlan.startCapital
                : (newCapital + calculateMaxNetProfit(
                    newCapital,
                    currentPlan.remainingEvents + eventsToAdd,
                    currentPlan.remainingWins + winsToAdd,
                    currentPlan.quota,
                    effectiveMaxLosses
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
            currentConsecutiveLosses: 0, // Reset CL on rescue reset logic
            maxConsecutiveLosses: effectiveMaxLosses
        });
    };



    const resetAll = () => {
        setHistory([]);
        setCurrentPlan(null);
    };

    const updatePlanStartCapital = (newStartCapital: number) => {
        if (!currentPlan) return;

        // Recalculate metrics based on new start capital
        const maxNetProfit = calculateMaxNetProfit(
            newStartCapital,
            currentPlan.totalEvents,
            currentPlan.expectedWins,
            currentPlan.quota,
            currentPlan.maxConsecutiveLosses || 0
        );

        const newTargetCapital = newStartCapital + maxNetProfit;
        const eventsPlayed = currentPlan.events.filter(e => !e.isSystemLog).length;

        const updatedPlan: MasaPlan = {
            ...currentPlan,
            startCapital: newStartCapital,
            maxNetProfit: maxNetProfit,
            targetCapital: newTargetCapital,
            // If no events played, update current capital too
            currentCapital: eventsPlayed === 0 ? newStartCapital : currentPlan.currentCapital
        };

        setCurrentPlan(updatedPlan);
    };

    const updateAbsoluteStartCapital = (newAmount: number) => {
        // 1. Determine the old start capital (baseline)
        let oldStart = config.initialCapital;
        if (history.length > 0) oldStart = history[0].startCapital;
        else if (currentPlan) oldStart = currentPlan.startCapital;

        if (oldStart <= 0 || newAmount <= 0) return;

        const scaleFactor = newAmount / oldStart;

        // 2. Update Config
        setConfig(prev => ({ ...prev, initialCapital: newAmount }));

        // 3. Helper to scale a plan
        const scalePlan = (plan: MasaPlan): MasaPlan => {
            const scaledEvents = plan.events.map(e => {
                // Cast to any to access potential dynamic properties if they exist in runtime but not type
                // or just stick to typed properties to be safe.
                // Snapshot in MasaEvent is optional.
                let newSnapshot = e.snapshot;
                if (newSnapshot && (newSnapshot as any).currentCapital) {
                    newSnapshot = { ...newSnapshot, currentCapital: roundTwo((newSnapshot as any).currentCapital * scaleFactor) } as any;
                }

                return {
                    ...e,
                    stake: roundTwo(e.stake * scaleFactor),
                    capitalAfter: roundTwo(e.capitalAfter * scaleFactor),
                    snapshot: newSnapshot
                };
            });

            return {
                ...plan,
                startCapital: roundTwo(plan.startCapital * scaleFactor),
                currentCapital: roundTwo(plan.currentCapital * scaleFactor),
                targetCapital: roundTwo(plan.targetCapital * scaleFactor),
                maxNetProfit: roundTwo(plan.maxNetProfit * scaleFactor),
                accumulatedAmount: plan.accumulatedAmount ? roundTwo(plan.accumulatedAmount * scaleFactor) : 0,
                events: scaledEvents
            };
        };

        // 4. Update History
        if (history.length > 0) {
            const newHistory = history.map(scalePlan);
            setHistory(newHistory);
        }

        // 5. Update Current Plan
        if (currentPlan) {
            const scaledCurrent = scalePlan(currentPlan);
            setCurrentPlan(scaledCurrent);
        }
    };

    return {
        plans,
        setPlans,
        activePlanId,
        setActivePlanId,
        config,
        setConfig,
        currentPlan,
        setCurrentPlan,
        history,
        setHistory,
        activeRules,
        setActiveRules,
        toggleRule,
        toggleAllRules,
        startNewPlan,
        handleFullBet,
        handlePartialWin,
        handlePartialLoss,
        handleBreakEven,
        handleAdjustment,
        activateRescueMode,
        resetAll,
        transitionToNextPlan,
        getNextStake,
        getRescueSuggestion: (extraCap?: number) => getRescueSuggestion(currentPlan, extraCap),
        savePlan,
        updatePlanStartCapital,
        updateAbsoluteStartCapital
    };
};
