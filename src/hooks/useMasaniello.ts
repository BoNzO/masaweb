import { useState, useEffect } from 'react';
import type { Config, MasaPlan, MasaEvent, EventSnapshot } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';
import { calculateStake, getRescueSuggestion, lockProfitInPlan } from '../utils/masaLogic';

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

export const useMasaniello = (
    persist: boolean = true,
    onFeedTriggered?: (amount: number) => void,
    onBufferUpdate?: (newBuffer: number) => void,
    onFeedBackTriggered?: (amount: number) => void
) => {
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
            feedSource: effectiveConfig.feedSource,
            elasticStretchesUsed: 0,
            elasticConfig: effectiveConfig.elasticConfig,
            hierarchyType: parentPlan?.hierarchyType || effectiveConfig.hierarchyType || 'STANDALONE',
            fatherPlanId: parentPlan?.fatherPlanId || effectiveConfig.fatherPlanId,
            fatherEventId: parentPlan?.fatherEventId || effectiveConfig.fatherEventId,
            fatherStake: parentPlan?.fatherStake || effectiveConfig.fatherStake,
            fatherQuota: parentPlan?.fatherQuota || effectiveConfig.fatherQuota,
            tradingCommission: effectiveConfig.tradingCommission
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

        // 0. Calculate Milestone Progress for this plan
        const totalBankedSoFar = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
        const totalWorth = closingPlan.currentCapital + totalBankedSoFar;
        const milestoneBase = config.initialCapital > 0 ? config.initialCapital : 1000;
        const currentMilestone = Math.floor(totalWorth / milestoneBase);
        const lastPlanInHistory = history.length > 0 ? history[history.length - 1] : null;
        const previousMilestone = lastPlanInHistory?.profitMilestoneReached || 0;

        // 1. END OF CYCLE BANKING (Aggregated)
        const isEndCondition = reason === 'manual_close' || reason === 'completed' || reason === 'target_reached' || reason === 'rescue_target_reached' || reason === 'auto_bank_100' || reason === 'profit_milestone' || reason === 'smart_auto_close' || reason === 'first_win_close' || reason === 'back_positive_close' || reason === 'profit_90_reset';

        const isTwin = config.role === 'twin' || closingPlan.role === 'twin';

        if (isEndCondition && cycleProfit > 0 && !isTwin) {
            // A. Normal Cycle Accumulation
            if (config.accumulationPercent > 0) {
                amountToBank = roundTwo(cycleProfit * (config.accumulationPercent / 100));
            }

            // B. Additional Milestone Banking
            if (activeRules.includes('profit_milestone') && (config.milestoneBankPercentage || 0) > 0 && config.initialCapital > 0) {
                if (currentMilestone > previousMilestone) {
                    const currentTotalProfit = roundTwo(totalWorth - config.initialCapital);
                    const milestoneTheoretical = roundTwo(currentTotalProfit * (config.milestoneBankPercentage / 100));
                    const extraMilestoneBank = Math.max(0, milestoneTheoretical);
                    amountToBank = roundTwo(Math.min(amountToBank + extraMilestoneBank, closingPlan.currentCapital * 0.7));
                }
            }
        }

        let nextCapital = roundTwo(closingPlan.currentCapital - amountToBank);

        // 4. Feed Forward to Slave (on closure)
        if (closingPlan.role === 'master' && closingPlan.feedForwardConfig && cycleProfit > 0) {
            const feedPercentage = closingPlan.feedForwardConfig.percentage;
            // The profit we are actually sharing is the net profit of this cycle
            // remaining after internal banking (which is the portion that will stay in the next cycle)
            const shareableProfit = roundTwo(cycleProfit - amountToBank);
            const feedAmount = roundTwo(shareableProfit * (feedPercentage / 100));

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
                // Store the amount fed in this specific cycle
                closingPlan.fedAmount = feedAmount;
            }
        }

        // 5. Feed Backward to Master (for slaves on closure)
        if (closingPlan.role === 'slave' && cycleProfit > 0) {
            // By default, ALL profit from slave goes back to master
            // except what might have been banked locally (if accumulation is on)
            const profitToFeedBack = roundTwo(cycleProfit - amountToBank);

            if (profitToFeedBack > 0) {
                if (onFeedBackTriggered) onFeedBackTriggered(profitToFeedBack);
                nextCapital = roundTwo(nextCapital - profitToFeedBack);
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
                });
            }
        }

        // Add Feed Backward Log
        if (closingPlan.role === 'slave' && cycleProfit > 0) {
            const feedBackAmount = roundTwo(cycleProfit - amountToBank);
            if (feedBackAmount > 0) {
                finalEvents.push({
                    id: `FEED_BACK_${Date.now()}`,
                    stake: 0,
                    isWin: false,
                    isVoid: true,
                    isPartialSequence: false,
                    isSystemLog: true,
                    message: `FEED BACKWARD: Trasferito profitto di €${feedBackAmount} al Master`,
                    capitalAfter: closingPlan.currentCapital,
                    eventsLeft: closingPlan.remainingEvents,
                    winsLeft: closingPlan.remainingWins,
                    timestamp: new Date().toISOString(),
                    quota: closingPlan.quota,
                    snapshot: createSnapshot(closingPlan),
                    feedAmount: feedBackAmount
                });
            }
        }

        const currentWeekHistory = history.filter(p => p.startWeeklyBaseline === closingPlan.startWeeklyBaseline);
        const sessionBanked = currentWeekHistory.reduce((sum, p) => sum + (p.accumulatedAmount || 0), 0);
        const sessionFed = currentWeekHistory.reduce((sum, p) => sum + (p.fedAmount || 0), 0);

        // Total worth of the session includes current capital + what was banked + what was sent to slaves
        const totalSessionWorth = closingPlan.currentCapital + sessionBanked + sessionFed;
        const isWeeklyTargetMet = closingPlan.currentWeeklyTarget &&
            totalSessionWorth >= closingPlan.currentWeeklyTarget - 0.01;

        const closedPlanWithStats: MasaPlan = {
            ...closingPlan,
            events: finalEvents,
            status: reason,
            treeStatus: 'completed',
            triggeredRule: ruleId,
            fedAmount: closingPlan.fedAmount || 0, // Ensure it's recorded
            weeklyTargetsReached: (closingPlan.weeklyTargetsReached || 0) + (
                reason === 'auto_bank_100' || isWeeklyTargetMet ? 1 : 0
            ),
            accumulatedAmount: amountToBank,
            milestonesBanked: milestonesBanked,
            profitMilestoneReached: Math.max(currentMilestone, closingPlan.profitMilestoneReached || 0),
        };

        // Update the closed plan in history/storage
        setPlans(prev => ({ ...prev, [closedPlanWithStats.id]: closedPlanWithStats }));

        // Add to history list (SAFER with functional update)
        setHistory(prev => [...prev, closedPlanWithStats]);

        // RESCUE CONFIG RESTORE: If the closing plan was rescued,
        // restore the original config so the next cycle uses the original parameters.
        // We read from the plan's preRescueConfig (persisted in localStorage).
        const savedPreRescueConfig = closingPlan.preRescueConfig;
        if (closingPlan.isRescued && savedPreRescueConfig) {
            setConfig(prev => ({
                ...prev,
                ...savedPreRescueConfig
            }));
        }

        // Create next plan linked to this one
        // Since setConfig is async, we pass the restored values directly as configOverrides
        const restoredConfig = (closingPlan.isRescued && savedPreRescueConfig)
            ? savedPreRescueConfig
            : {};

        const nextPlan = createNewPlan(
            nextCapital,
            closedPlanWithStats.id,
            closedPlanWithStats.generationNumber + 1,
            {
                feedForwardConfig: closedPlanWithStats.feedForwardConfig,
                ...restoredConfig
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
            elasticStretchesUsed: plan.elasticStretchesUsed || 0,
            suggestedStake: getNextStake(plan.quota),
            targetCapital: plan.targetCapital
        };
    };



    const checkPlanStatus = (planState: MasaPlan) => {
        planState.updatedAt = new Date().toISOString();
        const startCap = roundTwo(planState.startCapital);

        // Update wasNegative flag if capital drops below start capital
        if (planState.currentCapital < startCap - 0.01) {
            planState.wasNegative = true;
        }

        const prevCapital = currentPlan?.currentCapital || planState.startCapital;
        const isGrowth = planState.currentCapital > prevCapital + 0.001;

        // 1. Max Consecutive Losses
        if (planState.maxConsecutiveLosses && planState.maxConsecutiveLosses > 0 &&
            planState.currentConsecutiveLosses && planState.currentConsecutiveLosses > planState.maxConsecutiveLosses) {
            console.warn('[checkPlanStatus] TRIGGERING max_losses!', {
                maxCL: planState.maxConsecutiveLosses,
                currentCL: planState.currentConsecutiveLosses,
                hierarchy: planState.hierarchyType
            });
            const failedPlan = { ...planState, status: 'failed', triggeredRule: 'max_losses' };
            setHistory([...history, failedPlan]);
            setCurrentPlan(failedPlan as MasaPlan);
            return;
        }

        // 2. First Win Rule
        if (activeRules.includes('first_win') && planState.wins > (currentPlan?.wins || 0) && planState.losses === 0) {
            transitionToNextPlan(planState, 'first_win_close', 'first_win');
            return;
        }

        // 3. Back Positive Rule
        if (activeRules.includes('back_positive') && planState.wasNegative && planState.currentCapital >= startCap - 0.01) {
            transitionToNextPlan(planState, 'back_positive_close', 'back_positive');
            return;
        }

        // 4. Profit 90% Rule
        const profitMade = planState.currentCapital - startCap;
        if (activeRules.includes('profit_90') && isGrowth && profitMade >= planState.maxNetProfit * 0.9) {
            transitionToNextPlan(planState, 'profit_90_reset', 'profit_90');
            return;
        }

        // 5. All Wins (Completed) - Always close when all wins are consumed,
        // as the Masaniello formula cannot compute a valid stake with 0 remaining wins.
        if (planState.remainingWins <= 0) {
            transitionToNextPlan(planState, 'completed', 'all_wins');
            return;
        }


        // 7. (Removed) Rescue plans now complete through normal termination conditions
        // (all wins, all events exhausted, max consecutive losses, etc.)

        // 8. Weekly Target (Auto Bank 100 or Auto Reset)
        const absoluteTarget = planState.currentWeeklyTarget ?? (planState.startCapital * (1 + config.weeklyTargetPercentage / 100));

        const currentWeekHistory = history.filter(p => p.startWeeklyBaseline === planState.startWeeklyBaseline);
        const sessionBanked = currentWeekHistory.reduce((sum, p) => sum + (p.accumulatedAmount || 0), 0);
        const sessionFed = currentWeekHistory.reduce((sum, p) => sum + (p.fedAmount || 0), 0);

        const totalSessionWorth = planState.currentCapital + sessionBanked + sessionFed;

        if (config.weeklyTargetPercentage > 0 && isGrowth && totalSessionWorth >= absoluteTarget - 0.01) {
            // ALWAYS perform inline reset to keep the current Masaniello running
            // Banking will be performed at the end of the Masaniello cycle if auto_bank_100 is active
            planState.weeklyTargetsReached = (planState.weeklyTargetsReached || 0) + 1;
            planState.startWeeklyBaseline = planState.currentCapital;
            planState.currentWeeklyTarget = roundTwo(planState.currentCapital * (1 + config.weeklyTargetPercentage / 100));

            const isAutoBank = activeRules.includes('auto_bank_100');
            planState.events.push({
                id: `TARGET_REACHED_INLINE_${Date.now()}`,
                stake: 0,
                isWin: false,
                isVoid: true,
                isPartialSequence: false,
                isSystemLog: true,
                message: isAutoBank
                    ? `TARGET RAGGIUNTO: Reset settimanale (+${config.weeklyTargetPercentage}%). Accantonamento differito a fine ciclo.`
                    : `TARGET RAGGIUNTO: Reset settimanale (+${config.weeklyTargetPercentage}%)`,
                capitalAfter: planState.currentCapital,
                eventsLeft: planState.remainingEvents,
                winsLeft: planState.remainingWins,
                timestamp: new Date().toISOString(),
                quota: planState.quota,
                snapshot: createSnapshot(planState)
            });
        }

        // 9. Profit Milestone (Multiple of Capital)
        if (activeRules.includes('profit_milestone') && (config.milestoneBankPercentage || 0) > 0 && config.initialCapital > 0) {
            const totalBankedSoFar = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
            const totalWorth = planState.currentCapital + totalBankedSoFar;
            const milestoneBase = config.initialCapital;
            const currentMilestone = Math.floor(totalWorth / milestoneBase);

            if (isGrowth && currentMilestone > (planState.profitMilestoneReached || 0) && currentMilestone > 0) {
                // UPDATE counter but do NOT close the plan. Banking will happen at the end in transitionToNextPlan.
                planState.profitMilestoneReached = currentMilestone;
                planState.events.push({
                    id: `MILESTONE_REACHED_${Date.now()}`,
                    stake: 0,
                    isWin: false,
                    isVoid: true,
                    isPartialSequence: false,
                    isSystemLog: true,
                    message: `MILESTONE RAGGIUNTO: Profitto raddoppiato (${currentMilestone}x). Accantonamento differito a fine ciclo.`,
                    capitalAfter: planState.currentCapital,
                    eventsLeft: planState.remainingEvents,
                    winsLeft: planState.remainingWins,
                    timestamp: new Date().toISOString(),
                    quota: planState.quota,
                    snapshot: createSnapshot(planState)
                });
            }
        }

        // 9. Impossible Rule (moved from finalizeSequence)
        if (activeRules.includes('impossible') && (planState.remainingEvents < planState.remainingWins || (planState.remainingEvents === 0 && planState.remainingWins > 0))) {
            console.warn('[checkPlanStatus] TRIGGERING impossible!', {
                remainingEvents: planState.remainingEvents,
                remainingWins: planState.remainingWins,
                hierarchy: planState.hierarchyType,
                status: planState.status
            });
            const failedPlan = { ...planState, status: 'failed', triggeredRule: 'impossible' };
            setHistory([...history, failedPlan]);
            setCurrentPlan(failedPlan as MasaPlan);
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

        const finalStake = currentPlan.role === 'slave' && currentPlan.feedSource
            ? Math.min(stake, currentPlan.feedSource.virtualBuffer)
            : stake;

        return roundTwo(finalStake);
    };

    const handlePartialWin = (activeQuota: number, pair?: string, checklistResults?: Record<string, boolean>, note?: string) => {
        if (!currentPlan) return;
        const fullStake = getNextStake(activeQuota);
        const halfStake = roundTwo(fullStake / 2);
        const commissionRaw = (halfStake * (config.tradingCommission || 0)) / 100;
        const profitRaw = halfStake * (activeQuota - 1) - commissionRaw;
        const newCapital = roundTwo(currentPlan.currentCapital + profitRaw);

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
            snapshot: createSnapshot(currentPlan),
            note
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
            const newBuffer = roundTwo(currentPlan.feedSource.virtualBuffer + profitRaw);
            updatedPlan.feedSource = {
                ...currentPlan.feedSource,
                virtualBuffer: newBuffer,
                isPaused: newBuffer <= 0
            };
            if (onBufferUpdate) onBufferUpdate(newBuffer);
        }

        checkPlanStatus(updatedPlan);
    };

    const handlePartialLoss = (activeQuota: number, pair?: string, checklistResults?: Record<string, boolean>, note?: string) => {
        if (!currentPlan) return;
        const fullStake = getNextStake(activeQuota);
        const halfStake = roundTwo(fullStake / 2);
        const commissionRaw = (halfStake * (config.tradingCommission || 0)) / 100;
        const lossAmountRaw = halfStake + commissionRaw;
        const newCapital = roundTwo(currentPlan.currentCapital - lossAmountRaw);

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
            snapshot: createSnapshot(currentPlan),
            note
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
            const newBuffer = roundTwo(currentPlan.feedSource.virtualBuffer - lossAmountRaw);
            updatedPlan.feedSource = {
                ...currentPlan.feedSource,
                virtualBuffer: newBuffer,
                isPaused: newBuffer <= 0
            };
            if (onBufferUpdate) onBufferUpdate(newBuffer);
        }

        checkPlanStatus(updatedPlan);
    };

    const handleFullBet = (isWin: boolean, customQuota?: number, pair?: string, checklistResults?: Record<string, boolean>, surplus: number = 0, isHedge: boolean = false, skipSequence: boolean = false, note?: string) => {
        if (!currentPlan) return;
        const activeQuota = customQuota || currentPlan.quota;

        // DYNAMIC HEDGE LOGIC:
        // HedgeStake * (HedgeQuota - 1) = MainStake
        // HedgeStake = MainStake / (HedgeQuota - 1)
        const regularStake = getNextStake(activeQuota);
        const hQuota = config.hedgeQuota || 3.0;
        const actualStake = isHedge ? roundTwo(regularStake / (hQuota - 1)) : regularStake;

        const commissionRaw = (actualStake * (config.tradingCommission || 0)) / 100;
        const netResultRaw = isWin ? (actualStake * (activeQuota - 1) - commissionRaw + surplus) : (-actualStake - commissionRaw);

        const netResult = roundTwo(netResultRaw);
        const newCapital = roundTwo(currentPlan.currentCapital + netResult);

        // Sequence progression logic: Skip if isHedge OR if skipSequence is requested
        const progressionDisabled = isHedge || skipSequence;
        const nextEventsLeft = progressionDisabled ? currentPlan.remainingEvents : currentPlan.remainingEvents - 1;
        const nextWinsLeft = (isWin && !progressionDisabled) ? currentPlan.remainingWins - 1 : currentPlan.remainingWins;

        const sequenceDetail = [{ stake: actualStake, isWin, netResult }];

        const newEvent: MasaEvent = {
            id: currentPlan.events.filter((e) => !e.isSystemLog).length + 1,
            stake: actualStake,
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
            isHedge,
            snapshot: createSnapshot(currentPlan),
            note
        };

        const updatedPlan: MasaPlan = {
            ...currentPlan,
            currentCapital: newCapital,
            events: [...currentPlan.events, newEvent],
            remainingEvents: nextEventsLeft,
            remainingWins: nextWinsLeft,
            wins: (isWin && !isHedge) ? currentPlan.wins + 1 : currentPlan.wins,
            losses: (!isWin && !isHedge) ? currentPlan.losses + 1 : currentPlan.losses,
            currentConsecutiveLosses: isWin ? 0 : (isHedge ? currentPlan.currentConsecutiveLosses : (currentPlan.currentConsecutiveLosses || 0) + 1),
            lastUsedPair: pair || currentPlan.lastUsedPair,
            maxNetProfit: currentPlan.maxNetProfit
        };

        // REMOVED live feed forward to keep Masa math stable and feed ONLY on completion as requested

        // SLAVE BUFFER LOGIC
        if (currentPlan.role === 'slave' && currentPlan.feedSource) {
            const result = isWin ? roundTwo(actualStake * (activeQuota - 1) - commissionRaw) : roundTwo(-actualStake - commissionRaw);
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

    const handleHedgedBet = (hWin: boolean, mWin: boolean, mainQuota?: number, hQuota?: number, pair?: string, checklistResults?: Record<string, boolean>, note?: string) => {
        if (!currentPlan) return;
        const mQuota = mainQuota || currentPlan.quota;
        const hedgeQuota = hQuota || config.hedgeQuota || 3.0;

        const mainStake = getNextStake(mQuota);
        const hedgeStake = roundTwo(mainStake / (hedgeQuota - 1));

        const mComm = (mainStake * (config.tradingCommission || 0)) / 100;
        const hComm = (hedgeStake * (config.tradingCommission || 0)) / 100;

        const hNetRaw = hWin ? (hedgeStake * (hedgeQuota - 1) - hComm) : (-hedgeStake - hComm);
        const mNetRaw = mWin ? (mainStake * (mQuota - 1) - mComm) : (-mainStake - mComm);

        const hNet = roundTwo(hNetRaw);
        const totalNet = roundTwo(hNetRaw + mNetRaw);
        const newCapital = roundTwo(currentPlan.currentCapital + totalNet);

        // Sequence progression logic: Skip if hWin is true and mWin is false (Pure Hedge Success)
        // This prevents the Masaniello from losing an event when the coverage worked.
        const skipSeq = hWin === true && mWin === false;

        const nextEventsLeft = skipSeq ? currentPlan.remainingEvents : currentPlan.remainingEvents - 1;
        const nextWinsLeft = (mWin && !skipSeq) ? currentPlan.remainingWins - 1 : currentPlan.remainingWins;

        const baseEventId = currentPlan.events.filter((e) => !e.isSystemLog).length;

        const hEvent: MasaEvent = {
            id: baseEventId + 1,
            stake: hedgeStake,
            isWin: hWin,
            isVoid: false,
            isPartialSequence: false,
            message: 'HEDGE TRADE',
            capitalAfter: roundTwo(currentPlan.currentCapital + hNet),
            eventsLeft: currentPlan.remainingEvents,
            winsLeft: currentPlan.remainingWins,
            timestamp: new Date().toISOString(),
            nyTimestamp: getNYTime(),
            pair: pair || currentPlan.lastUsedPair,
            isHedge: true,
            quota: hedgeQuota,
            snapshot: createSnapshot(currentPlan),
            note
        };

        const mEvent: MasaEvent = {
            id: baseEventId + 2,
            stake: mainStake,
            isWin: mWin,
            isVoid: false,
            isPartialSequence: false,
            message: 'MAIN TRADE (HEDGED)',
            capitalAfter: newCapital,
            eventsLeft: nextEventsLeft,
            winsLeft: nextWinsLeft,
            timestamp: new Date().toISOString(),
            nyTimestamp: getNYTime(),
            pair: pair || currentPlan.lastUsedPair,
            isHedge: false,
            checklistResults,
            quota: mQuota,
            snapshot: createSnapshot(currentPlan),
            note
        };

        const updatedPlan: MasaPlan = {
            ...currentPlan,
            currentCapital: newCapital,
            events: [...currentPlan.events, hEvent, mEvent],
            remainingEvents: nextEventsLeft,
            remainingWins: nextWinsLeft,
            wins: (mWin && !skipSeq) ? currentPlan.wins + 1 : currentPlan.wins,
            losses: (!mWin && !skipSeq) ? currentPlan.losses + 1 : currentPlan.losses,
            currentConsecutiveLosses: mWin ? 0 : (skipSeq ? currentPlan.currentConsecutiveLosses : (currentPlan.currentConsecutiveLosses || 0) + 1),
            lastUsedPair: pair || currentPlan.lastUsedPair,
            maxNetProfit: currentPlan.maxNetProfit
        };

        // SLAVE BUFFER LOGIC
        if (currentPlan.role === 'slave' && currentPlan.feedSource) {
            const resultH = hWin ? roundTwo(hedgeStake * (hedgeQuota - 1) - hComm) : roundTwo(-hedgeStake - hComm);
            const resultM = mWin ? roundTwo(mainStake * (mQuota - 1) - mComm) : roundTwo(-mainStake - mComm);
            const totalResult = roundTwo(resultH + resultM);
            const newBuffer = roundTwo(currentPlan.feedSource.virtualBuffer + totalResult);
            updatedPlan.feedSource = {
                ...currentPlan.feedSource,
                virtualBuffer: Math.max(0, newBuffer),
                isPaused: newBuffer <= 0
            };
            if (onBufferUpdate) onBufferUpdate(Math.max(0, newBuffer));
        }

        checkPlanStatus(updatedPlan);
    };

    const handleBreakEven = (note?: string) => {
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
            snapshot: createSnapshot(currentPlan),
            note
        };

        setCurrentPlan({
            ...currentPlan,
            events: [...currentPlan.events, beEvent],
        });
    };



    const lockProfit = (amount: number): MasaPlan | null => {
        if (!currentPlan || amount <= 0 || amount > currentPlan.currentCapital) return null;
        const updated = lockProfitInPlan(currentPlan, amount);
        setCurrentPlan(updated); // Assuming setPlans is meant to be setCurrentPlan for the active plan
        return updated;
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

        // Save original config on the plan BEFORE modifying it (only on first rescue)
        const planPreRescueConfig = currentPlan.preRescueConfig || {
            totalEvents: config.totalEvents,
            expectedWins: config.expectedWins,
            maxConsecutiveLosses: config.maxConsecutiveLosses
        };

        const updatedPlan: MasaPlan = {
            ...currentPlan,
            currentCapital: newCapital,
            totalEvents: currentPlan.totalEvents + eventsToAdd,
            remainingEvents: currentPlan.remainingEvents + eventsToAdd,
            expectedWins: currentPlan.expectedWins + winsToAdd,
            remainingWins: currentPlan.remainingWins + winsToAdd,
            targetCapital: newTarget,
            maxNetProfit: newProfit,
            isRescued: true,
            preRescueConfig: planPreRescueConfig, // Persisted on the plan for localStorage survival
            events: [...currentPlan.events, rescueEventLog],
            currentConsecutiveLosses: 0, // Reset CL on rescue reset logic
            maxConsecutiveLosses: effectiveMaxLosses
        };


        setCurrentPlan(updatedPlan);

        // Also update local config to maintain consistency in UI summaries
        setConfig(prev => ({
            ...prev,
            totalEvents: updatedPlan.totalEvents,
            expectedWins: updatedPlan.expectedWins,
            maxConsecutiveLosses: effectiveMaxLosses
        }));
    };


    const activateElasticHorizon = () => {
        if (!currentPlan) return;
        const elastic = currentPlan.elasticConfig || config.elasticConfig;
        if (!elastic?.enabled) return;

        const updatedPlan: MasaPlan = {
            ...currentPlan,
            totalEvents: currentPlan.totalEvents + elastic.addEvents,
            remainingEvents: currentPlan.remainingEvents + elastic.addEvents,
            expectedWins: currentPlan.expectedWins + elastic.addWins,
            remainingWins: currentPlan.remainingWins + elastic.addWins,
            elasticStretchesUsed: (currentPlan.elasticStretchesUsed || 0) + 1,
            currentConsecutiveLosses: 0
        };

        // Recalculate max profit and target
        const newMaxProfit = calculateMaxNetProfit(
            updatedPlan.startCapital,
            updatedPlan.totalEvents,
            updatedPlan.expectedWins,
            updatedPlan.quota,
            updatedPlan.maxConsecutiveLosses || 0
        );

        updatedPlan.maxNetProfit = newMaxProfit;
        updatedPlan.targetCapital = updatedPlan.startCapital + newMaxProfit;

        // Log the event
        const elasticEvent: MasaEvent = {
            id: `ELASTIC_${Date.now()}`,
            stake: 0,
            isWin: false,
            isVoid: true,
            isPartialSequence: false,
            isSystemLog: true,
            message: `ELASTICO: Estensione applicata (+${elastic.addEvents}E, +${elastic.addWins}V)`,
            capitalAfter: updatedPlan.currentCapital,
            eventsLeft: updatedPlan.remainingEvents,
            winsLeft: updatedPlan.remainingWins,
            timestamp: new Date().toISOString(),
            quota: updatedPlan.quota,
            snapshot: createSnapshot(updatedPlan)
        };

        updatedPlan.events = [...currentPlan.events, elasticEvent];

        setCurrentPlan(updatedPlan);
    };

    const resetAll = () => {
        // If the current plan was in rescue mode, restore the original config
        if (currentPlan?.isRescued && currentPlan?.preRescueConfig) {
            setConfig(prev => ({
                ...prev,
                ...currentPlan.preRescueConfig
            }));
        }
        setHistory([]);
        setCurrentPlan(null);
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
        handleHedgedBet,
        handlePartialWin,
        handlePartialLoss,
        handleBreakEven,
        activateRescueMode,
        activateElasticHorizon,
        resetAll,
        transitionToNextPlan,
        getNextStake,
        lockProfit,
        getRescueSuggestion: (extraCap?: number) => getRescueSuggestion(currentPlan, extraCap),
        savePlan,
        updateConfig: (newConfig: Partial<Config>) => setConfig(prev => ({ ...prev, ...newConfig }))
    };
};
