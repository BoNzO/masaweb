import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
    MasanielloInstance,
    MultiMasaState,
    CapitalPool,
    CapitalPoolTransaction,
    AggregatedStats,
    Config,
    ChartDataPoint,
    MasaPlan,
    MasaEvent
} from '../types/masaniello';
import { createInitialPlan, calculateStake } from '../utils/masaLogic';
import { calculateMaxNetProfit, roundTwo } from '../utils/mathUtils';

const STORAGE_KEY = 'multi_masaniello_state';
const MAX_ACTIVE_INSTANCES = 5;

const createEmptyCapitalPool = (): CapitalPool => ({
    totalAvailable: 0,
    totalDeposited: 0,
    allocations: {},
    history: [],
    lifetimeWins: 0,
    lifetimeLosses: 0
});

const createDefaultMultiState = (): MultiMasaState => ({
    instances: {},
    capitalPool: createEmptyCapitalPool(),
    activeInstanceIds: [],
    archivedInstanceIds: [],
    currentViewId: 'overview',
    savedLogs: []
});

export const useMultiMasaniello = () => {
    // Load initial state from localStorage
    const [multiState, setMultiState] = useState<MultiMasaState>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse multi-masa state:', e);
            }
        }
        return createDefaultMultiState();
    });

    // Persist state to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(multiState));
    }, [multiState]);

    // Auto-repair totalDeposited if missing but instances exist
    useEffect(() => {
        if (multiState.capitalPool.totalDeposited === 0) {
            const activeAllocations = Object.values(multiState.instances)
                .filter(i => i.status === 'active')
                .reduce((sum, i) => sum + i.absoluteStartCapital, 0);

            if (activeAllocations > 0 || multiState.capitalPool.totalAvailable > 0) {
                setMultiState(prev => ({
                    ...prev,
                    capitalPool: {
                        ...prev.capitalPool,
                        totalDeposited: activeAllocations + prev.capitalPool.totalAvailable
                    }
                }));
            }
        }
    }, []);

    // Create a new Masaniello instance
    const createMasaniello = useCallback((config: Config, initialCapital?: number, activeRules?: string[]) => {
        setMultiState(prev => {
            if (prev.activeInstanceIds.length >= MAX_ACTIVE_INSTANCES) {
                alert(`Puoi avere massimo ${MAX_ACTIVE_INSTANCES} Masanielli attivi. Archivia uno prima di crearne uno nuovo.`);
                return prev;
            }

            // Find next available number
            const existingNumbers = Object.values(prev.instances).map(i => i.number);
            let nextNumber = 1;
            while (existingNumbers.includes(nextNumber)) {
                nextNumber++;
            }

            const newId = `masa_${nextNumber}`;
            const capitalToAllocate = config.role === 'twin'
                ? (config.twinConfig?.capitalLong || 0) + (config.twinConfig?.capitalShort || 0)
                : (initialCapital || config.initialCapital);

            // Check if pool has enough capital
            if (capitalToAllocate > prev.capitalPool.totalAvailable) {
                alert(`Capitale insufficiente nel pool. Disponibile: €${Math.ceil(prev.capitalPool.totalAvailable).toLocaleString('it-IT')}`);
                return prev;
            }

            // Create the first plan automatically
            const initialPlan = createInitialPlan(config, capitalToAllocate);

            const initialPlanLong = config.role === 'twin' ? createInitialPlan({
                ...config,
                quota: config.twinConfig?.quotaLong || config.quota,
                totalEvents: config.twinConfig?.totalEventsLong || config.totalEvents,
                expectedWins: config.twinConfig?.expectedWinsLong || config.expectedWins
            }, config.twinConfig?.capitalLong || 1000) : initialPlan;

            const initialPlanShort = config.role === 'twin' ? createInitialPlan({
                ...config,
                quota: config.twinConfig?.quotaShort || config.quota,
                totalEvents: config.twinConfig?.totalEventsShort || config.totalEvents,
                expectedWins: config.twinConfig?.expectedWinsShort || config.expectedWins
            }, config.twinConfig?.capitalShort || 1000) : initialPlan;


            const newInstance: MasanielloInstance = {
                id: newId,
                number: nextNumber,
                name: `Masaniello #${nextNumber}`,
                status: 'active',
                type: config.role === 'differential' ? 'differential' : config.role === 'twin' ? 'twin' : 'standard',
                config,
                activeRules: activeRules || [],
                currentPlan: (config.role === 'differential' || config.role === 'twin') ? null : {
                    ...initialPlan,
                    hierarchyType: 'STANDALONE'
                },
                differentialState: config.role === 'differential' ? {
                    planA: { ...initialPlan, hierarchyType: 'STANDALONE' },
                    planB: { ...initialPlan, hierarchyType: 'STANDALONE' },
                    status: 'active',
                    realCapital: capitalToAllocate,
                    history: []
                } : undefined,
                twinState: config.role === 'twin' ? {
                    planLong: { ...initialPlanLong, hierarchyType: 'STANDALONE' },
                    planShort: { ...initialPlanShort, hierarchyType: 'STANDALONE' },
                    historyLong: [],
                    historyShort: [],
                    activeSide: null
                } : undefined,
                history: [],
                absoluteStartCapital: capitalToAllocate,
                globalWeeklyTargetsReached: 0,
                persistentWeeklyTarget: initialPlan.currentWeeklyTarget,
                persistentWeeklyBaseline: initialPlan.startWeeklyBaseline || initialPlan.startCapital,
                createdAt: new Date().toISOString()
            };

            // Create capital pool transaction
            const transaction: CapitalPoolTransaction = {
                id: `tx_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'allocation',
                amount: capitalToAllocate,
                toMasaId: newId,
                description: `Allocazione iniziale a ${newInstance.name}`
            };

            const newState = {
                ...prev,
                instances: {
                    ...prev.instances,
                    [newId]: newInstance
                },
                capitalPool: {
                    ...prev.capitalPool,
                    totalAvailable: prev.capitalPool.totalAvailable - capitalToAllocate,
                    totalDeposited: prev.capitalPool.totalDeposited === 0 ? capitalToAllocate : prev.capitalPool.totalDeposited,
                    allocations: {
                        ...prev.capitalPool.allocations,
                        [newId]: capitalToAllocate
                    },
                    history: [...prev.capitalPool.history, transaction]
                },
                activeInstanceIds: [...prev.activeInstanceIds, newId],
                currentViewId: newId
            };

            // AUTO-LINK: If this is a Slave, update its Master to point to it
            if (config.role === 'slave' && config.feedSource?.masterPlanId) {
                const masterId = config.feedSource.masterPlanId;
                const master = newState.instances[masterId];
                if (master && master.config.role === 'master') {
                    // Update master's config to point to this new slave
                    newState.instances[masterId] = {
                        ...master,
                        config: {
                            ...master.config,
                            feedForwardConfig: {
                                ...(master.config.feedForwardConfig || { percentage: 50, totalFed: 0 }),
                                slavePlanId: newId
                            }
                        }
                    };
                }
            }

            return newState;
        });
    }, []);

    // Archive a Masaniello instance (releases capital back to pool)
    const archiveMasaniello = useCallback((masaId: string) => {
        setMultiState(prev => {
            const instance = prev.instances[masaId];
            if (!instance || instance.status !== 'active') return prev;

            // PROTECT SON PLANS: They should be resolved, not archived manually to pool
            if (instance.currentPlan?.hierarchyType === 'SON') {
                alert("I Masa Figlio non possono essere archiviati manualmente. Devono essere risolti per tornare al Padre.");
                return prev;
            }

            // Calculate capital to release (total current worth of the instance)
            let historyProfits = 0;
            let currentProfits = 0;

            if (instance.type === 'twin' && instance.twinState) {
                // For Twin, individual side histories (historyLong/historyShort) are the source of truth
                const hl = instance.twinState.historyLong || [];
                const hs = instance.twinState.historyShort || [];
                historyProfits = hl.reduce((sum, p) => sum + (p.currentCapital - p.startCapital), 0) +
                    hs.reduce((sum, p) => sum + (p.currentCapital - p.startCapital), 0);

                currentProfits = (instance.twinState.planLong.currentCapital - instance.twinState.planLong.startCapital) +
                    (instance.twinState.planShort.currentCapital - instance.twinState.planShort.startCapital);
            } else {
                historyProfits = instance.history.reduce((sum, p) => sum + (p.currentCapital - p.startCapital), 0);
                if (instance.type === 'differential' && instance.differentialState) {
                    currentProfits = (instance.differentialState.realCapital || instance.absoluteStartCapital) - instance.absoluteStartCapital;
                } else if (instance.currentPlan) {
                    currentProfits = instance.currentPlan.currentCapital - instance.currentPlan.startCapital;
                }
            }

            const totalCapital = roundTwo(instance.absoluteStartCapital + historyProfits + currentProfits);

            // Create transaction
            const transaction: CapitalPoolTransaction = {
                id: `tx_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'release',
                amount: totalCapital,
                fromMasaId: masaId,
                description: `Capitale rilasciato da ${instance.name} (archiviato)`
            };

            // Update instance
            const archivedInstance: MasanielloInstance = {
                ...instance,
                status: 'archived',
                archivedAt: new Date().toISOString()
            };

            // Remove from allocations
            const newAllocations = { ...prev.capitalPool.allocations };
            delete newAllocations[masaId];

            return {
                ...prev,
                instances: {
                    ...prev.instances,
                    [masaId]: archivedInstance
                },
                capitalPool: {
                    ...prev.capitalPool,
                    totalAvailable: prev.capitalPool.totalAvailable + totalCapital,
                    allocations: newAllocations,
                    history: [...prev.capitalPool.history, transaction]
                },
                activeInstanceIds: prev.activeInstanceIds.filter(id => id !== masaId),
                archivedInstanceIds: [...prev.archivedInstanceIds, masaId],
                currentViewId: 'new', // Switch to new Masaniello creation
                savedLogs: [
                    {
                        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        instanceName: instance.name,
                        instanceType: instance.type || 'standard',
                        timestamp: new Date().toISOString(),
                        // For complex types, saving a consolidated snapshot or the primary active plan
                        plan: (instance.type === 'twin' && instance.twinState)
                            ? { ...instance.twinState.planLong, name: `${instance.name} (Twin Combined)`, currentCapital: totalCapital }
                            : (instance.type === 'differential' && instance.differentialState)
                                ? { ...instance.differentialState.planA, name: `${instance.name} (Differential)`, currentCapital: totalCapital }
                                : { ...(instance.currentPlan || instance.history[instance.history.length - 1]) }
                    },
                    ...(prev.savedLogs || [])
                ]
            };
        });
    }, []);

    // Delete a Masaniello instance (permanently)
    const deleteMasaniello = useCallback((masaId: string) => {
        setMultiState(prev => {
            const instance = prev.instances[masaId];
            if (!instance) return prev;

            // 1. Recover wins/losses for lifetime totals before deleting
            let instWins = 0;
            let instLosses = 0;
            const allPlans = [...instance.history];
            if (instance.currentPlan) allPlans.push(instance.currentPlan);

            allPlans.forEach(p => {
                p.events.forEach(e => {
                    if (!e.isSystemLog && !e.isVoid && !(e as any).isHierarchySummary) {
                        if (e.isWin) instWins++; else instLosses++;
                    }
                });
            });

            let updatedPool = {
                ...prev.capitalPool,
                lifetimeWins: (prev.capitalPool.lifetimeWins || 0) + instWins,
                lifetimeLosses: (prev.capitalPool.lifetimeLosses || 0) + instLosses
            };

            const newInstances = { ...prev.instances };
            delete newInstances[masaId];

            // If it was an active instance, release its current capital back to pool or father
            if (prev.activeInstanceIds.includes(masaId) && instance.status === 'active') {
                const currentCapitalValue = instance.currentPlan?.currentCapital || instance.absoluteStartCapital;
                const bankedAmountAtHand = instance.history.reduce((sum, plan) => sum + (plan.accumulatedAmount || 0), 0);
                const totalReleased = currentCapitalValue + bankedAmountAtHand;

                const isSon = instance.currentPlan?.hierarchyType === 'SON' && instance.currentPlan?.fatherPlanId;
                const fatherId = instance.currentPlan?.fatherPlanId;

                const newAllocations = { ...updatedPool.allocations };
                delete newAllocations[masaId];

                if (isSon && fatherId && newInstances[fatherId] && newInstances[fatherId].currentPlan) {
                    const transaction: CapitalPoolTransaction = {
                        id: `tx_${Date.now()}_son_del`,
                        timestamp: new Date().toISOString(),
                        type: 'transfer',
                        amount: totalReleased,
                        fromMasaId: masaId,
                        toMasaId: fatherId,
                        description: `Capitale recuperato da ${instance.name} (eliminato)`
                    };

                    newAllocations[fatherId] = (newAllocations[fatherId] || 0) + totalReleased;
                    const father = newInstances[fatherId];
                    newInstances[fatherId] = {
                        ...father,
                        currentPlan: {
                            ...father.currentPlan!,
                            currentCapital: roundTwo(father.currentPlan!.currentCapital + totalReleased)
                        }
                    };

                    updatedPool = {
                        ...updatedPool,
                        allocations: newAllocations,
                        history: [...updatedPool.history, transaction]
                    };
                } else {
                    const transaction: CapitalPoolTransaction = {
                        id: `tx_${Date.now()}_del`,
                        timestamp: new Date().toISOString(),
                        type: 'release',
                        amount: totalReleased,
                        fromMasaId: masaId,
                        description: `Capitale recuperato da ${instance.name} (eliminato)`
                    };

                    updatedPool = {
                        ...updatedPool,
                        totalAvailable: updatedPool.totalAvailable + totalReleased,
                        allocations: newAllocations,
                        history: [...updatedPool.history, transaction]
                    };
                }
            }

            return {
                ...prev,
                instances: newInstances,
                capitalPool: updatedPool,
                activeInstanceIds: prev.activeInstanceIds.filter(id => id !== masaId),
                archivedInstanceIds: prev.archivedInstanceIds.filter(id => id !== masaId),
                currentViewId: prev.currentViewId === masaId ? 'overview' : prev.currentViewId
            };
        });
    }, []);

    // Clone a Masaniello (copy config + current capital)
    const cloneMasaniello = useCallback((sourceId: string) => {
        const source = multiState.instances[sourceId];
        if (!source) return;

        const currentCapital = source.currentPlan?.currentCapital || source.absoluteStartCapital;
        createMasaniello(source.config, currentCapital);
    }, [multiState.instances, createMasaniello]);

    // Reset a Masaniello instance to its initial state
    const resetMasaniello = useCallback((masaId: string) => {
        setMultiState(prev => {
            const instance = prev.instances[masaId];
            if (!instance) return prev;

            const resetActiveRules = instance.activeRules || [];

            // preserve hierarchy and related fields in the config
            let updatedConfig = { ...instance.config };
            if (instance.config.role === 'slave' && instance.config.feedSource) {
                updatedConfig = {
                    ...updatedConfig,
                    feedSource: {
                        ...instance.config.feedSource,
                        virtualBuffer: instance.absoluteStartCapital,
                        isPaused: instance.absoluteStartCapital <= 0
                    }
                };
            }

            // Carry over hierarchy properties from the current plan to the config if not already there
            if (instance.currentPlan) {
                updatedConfig.hierarchyType = instance.currentPlan.hierarchyType;
                updatedConfig.fatherPlanId = instance.currentPlan.fatherPlanId;
                updatedConfig.fatherEventId = instance.currentPlan.fatherEventId;
                updatedConfig.fatherStake = instance.currentPlan.fatherStake;
                updatedConfig.fatherQuota = instance.currentPlan.fatherQuota;
            }

            const basePlan = createInitialPlan(updatedConfig, instance.absoluteStartCapital);
            const basePlanLong = updatedConfig.role === 'twin' ? createInitialPlan({
                ...updatedConfig,
                quota: updatedConfig.twinConfig?.quotaLong || updatedConfig.quota,
                totalEvents: updatedConfig.twinConfig?.totalEventsLong || updatedConfig.totalEvents,
                expectedWins: updatedConfig.twinConfig?.expectedWinsLong || updatedConfig.expectedWins
            }, updatedConfig.twinConfig?.capitalLong || 1000) : basePlan;

            const basePlanShort = updatedConfig.role === 'twin' ? createInitialPlan({
                ...updatedConfig,
                quota: updatedConfig.twinConfig?.quotaShort || updatedConfig.quota,
                totalEvents: updatedConfig.twinConfig?.totalEventsShort || updatedConfig.totalEvents,
                expectedWins: updatedConfig.twinConfig?.expectedWinsShort || updatedConfig.expectedWins
            }, updatedConfig.twinConfig?.capitalShort || 1000) : basePlan;

            const resetInstance: MasanielloInstance = {
                ...instance,
                config: updatedConfig,
                currentPlan: (updatedConfig.role === 'differential' || updatedConfig.role === 'twin') ? null : basePlan,
                differentialState: updatedConfig.role === 'differential' ? {
                    planA: { ...basePlan },
                    planB: { ...basePlan },
                    status: 'active',
                    realCapital: instance.absoluteStartCapital,
                    history: []
                } : undefined,
                twinState: updatedConfig.role === 'twin' ? {
                    planLong: { ...basePlanLong },
                    planShort: { ...basePlanShort },
                    historyLong: [],
                    historyShort: [],
                    activeSide: null
                } : undefined,
                history: [],
                activeRules: resetActiveRules,
                globalWeeklyTargetsReached: 0,
                persistentWeeklyTarget: undefined,
                persistentWeeklyBaseline: undefined,
                sonsCompleted: 0,
                sonsFailed: 0,
                missionResultQueued: null
            };

            return {
                ...prev,
                instances: {
                    ...prev.instances,
                    [masaId]: resetInstance
                }
            };
        });
    }, []);

    // Add capital to pool
    const addCapitalToPool = useCallback((amount: number) => {
        setMultiState(prev => {
            const transaction: CapitalPoolTransaction = {
                id: `tx_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'allocation',
                amount,
                description: 'Aggiunta capitale al pool'
            };

            return {
                ...prev,
                capitalPool: {
                    ...prev.capitalPool,
                    totalAvailable: prev.capitalPool.totalAvailable + amount,
                    totalDeposited: (prev.capitalPool.totalDeposited || 0) + amount,
                    history: [...prev.capitalPool.history, transaction]
                }
            };
        });
    }, []);

    const setAvailableCapital = useCallback((newAmount: number) => {
        setMultiState(prev => {
            const difference = newAmount - prev.capitalPool.totalAvailable;
            const transaction: CapitalPoolTransaction = {
                id: `tx_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'allocation',
                amount: difference,
                description: difference > 0
                    ? `Capitale disponibile aumentato di €${Math.ceil(difference).toLocaleString('it-IT')}`
                    : `Capitale disponibile ridotto di €${Math.ceil(Math.abs(difference)).toLocaleString('it-IT')}`
            };

            return {
                ...prev,
                capitalPool: {
                    ...prev.capitalPool,
                    totalAvailable: newAmount,
                    totalDeposited: newAmount + Object.values(prev.capitalPool.allocations).reduce((a, b) => a + b, 0),
                    history: [...prev.capitalPool.history, transaction]
                }
            };
        });
    }, []);

    // Update instance (used by individual Masaniello hooks)
    const updateInstance = useCallback((masaId: string, updates: Partial<MasanielloInstance>) => {
        setMultiState(prev => {
            const instance = prev.instances[masaId];
            if (!instance) return prev;

            let finalUpdates = { ...updates };

            // SYNC WEEKLY TARGET DATA
            if (updates.currentPlan) {
                finalUpdates.persistentWeeklyTarget = updates.currentPlan.currentWeeklyTarget;
                finalUpdates.persistentWeeklyBaseline = updates.currentPlan.startWeeklyBaseline;

                const hist = updates.history || instance.history || [];
                const historyReached = hist.reduce((sum: number, p: any) => sum + (p.weeklyTargetsReached || 0), 0);
                const currentReached = (updates.currentPlan || instance.currentPlan)?.weeklyTargetsReached || 0;
                finalUpdates.globalWeeklyTargetsReached = historyReached + currentReached;
            } else if (updates.history) {
                const historyReached = updates.history.reduce((sum: number, p: any) => sum + (p.weeklyTargetsReached || 0), 0);
                const currentReached = (instance.currentPlan)?.weeklyTargetsReached || 0;
                finalUpdates.globalWeeklyTargetsReached = historyReached + currentReached;
            }

            // Recalculate based on config changes
            if (updates.config && JSON.stringify(updates.config) !== JSON.stringify(instance.config)) {
                const newConfig = updates.config as Config;
                const planWasReset = 'currentPlan' in updates && updates.currentPlan === null;
                const plan = planWasReset ? null : (updates.currentPlan || instance.currentPlan);

                if (plan) {
                    const hasStarted = plan.events.filter(e => !e.isSystemLog).length > 0;
                    const isFollowUpPlan = (plan.generationNumber || 0) > 0;
                    const baseCapital = (isFollowUpPlan || updates.currentPlan)
                        ? plan.startCapital
                        : newConfig.initialCapital;

                    if (!isFollowUpPlan && !hasStarted && newConfig.initialCapital !== instance.config.initialCapital) {
                        finalUpdates.absoluteStartCapital = newConfig.initialCapital;
                    }

                    if (!hasStarted) {
                        const maxProfit = calculateMaxNetProfit(baseCapital, newConfig.totalEvents, newConfig.expectedWins, newConfig.quota, newConfig.maxConsecutiveLosses || 0);

                        // SON plans: preserve the mission targetCapital (father's required return)
                        // instead of resetting it to the internally calculated maxProfit
                        const isSonPlan = plan.hierarchyType === 'SON' && plan.fatherStake && plan.fatherQuota;
                        const sonMissionTarget = isSonPlan
                            ? roundTwo(plan.fatherStake! + plan.fatherStake! * (plan.fatherQuota! - 1))
                            : null;
                        const effectiveTarget = sonMissionTarget || (baseCapital + maxProfit);
                        const effectiveMaxProfit = effectiveTarget - baseCapital;

                        finalUpdates.currentPlan = {
                            ...plan,
                            startCapital: baseCapital,
                            currentCapital: baseCapital,
                            targetCapital: effectiveTarget,
                            maxNetProfit: effectiveMaxProfit,
                            quota: newConfig.quota,
                            totalEvents: newConfig.totalEvents,
                            expectedWins: newConfig.expectedWins,
                            remainingEvents: newConfig.totalEvents,
                            remainingWins: newConfig.expectedWins,
                            maxConsecutiveLosses: newConfig.maxConsecutiveLosses,
                            currentWeeklyTarget: (newConfig.weeklyTargetPercentage === instance.config.weeklyTargetPercentage && plan.currentWeeklyTarget) ? plan.currentWeeklyTarget : baseCapital * (1 + (newConfig.weeklyTargetPercentage || 20) / 100),
                            role: newConfig.role,
                            feedForwardConfig: newConfig.feedForwardConfig,
                            feedSource: newConfig.feedSource,
                            tradingCommission: newConfig.tradingCommission
                        };
                    }
                }

                // Complex state updates (Twins / Differential)
                if (instance.type === 'twin' && instance.twinState) {
                    const twin = instance.twinState;
                    const longHasStarted = twin.planLong.events.filter(e => !e.isSystemLog).length > 0;
                    const shortHasStarted = twin.planShort.events.filter(e => !e.isSystemLog).length > 0;
                    let updatedTwin = { ...twin };

                    if (!longHasStarted) {
                        const qL = (newConfig.twinConfig?.quotaLong || newConfig.quota);
                        const teL = (newConfig.twinConfig?.totalEventsLong || newConfig.totalEvents);
                        const ewL = (newConfig.twinConfig?.expectedWinsLong || newConfig.expectedWins);
                        const capLong = newConfig.twinConfig?.capitalLong || (newConfig.initialCapital / 2);

                        updatedTwin.planLong = {
                            ...createInitialPlan({
                                ...newConfig,
                                quota: qL,
                                totalEvents: teL,
                                expectedWins: ewL
                            }, capLong),
                            id: twin.planLong.id,
                            hierarchyType: twin.planLong.hierarchyType
                        };
                    }

                    if (!shortHasStarted) {
                        const qS = (newConfig.twinConfig?.quotaShort || newConfig.quota);
                        const teS = (newConfig.twinConfig?.totalEventsShort || newConfig.totalEvents);
                        const ewS = (newConfig.twinConfig?.expectedWinsShort || newConfig.expectedWins);
                        const capShort = newConfig.twinConfig?.capitalShort || (newConfig.initialCapital / 2);

                        updatedTwin.planShort = {
                            ...createInitialPlan({
                                ...newConfig,
                                quota: qS,
                                totalEvents: teS,
                                expectedWins: ewS
                            }, capShort),
                            id: twin.planShort.id,
                            hierarchyType: twin.planShort.hierarchyType
                        };
                    }
                    finalUpdates.twinState = updatedTwin;
                } else if (instance.type === 'differential' && instance.differentialState) {
                    const diff = instance.differentialState;
                    const startedA = diff.planA.events.filter(e => !e.isSystemLog).length > 0;
                    const startedB = diff.planB.events.filter(e => !e.isSystemLog).length > 0;

                    if (!startedA && !startedB) {
                        const freshPlan = createInitialPlan(newConfig, newConfig.initialCapital);
                        finalUpdates.differentialState = {
                            ...diff,
                            planA: { ...freshPlan, id: diff.planA.id, hierarchyType: diff.planA.hierarchyType },
                            planB: { ...freshPlan, id: diff.planB.id, hierarchyType: diff.planB.hierarchyType },
                            realCapital: newConfig.initialCapital
                        };
                    }
                }
            }

            let updatedPool = { ...prev.capitalPool };
            if (updates.config && updates.config.initialCapital !== undefined && instance.config.initialCapital !== updates.config.initialCapital) {
                const isFirstGen = (instance.currentPlan?.generationNumber || 0) === 0;
                const hasNotStarted = !instance.currentPlan?.events?.some(e => !e.isSystemLog);
                if (isFirstGen && hasNotStarted) {
                    const diff = updates.config.initialCapital - instance.config.initialCapital;
                    updatedPool = {
                        ...updatedPool,
                        totalAvailable: updatedPool.totalAvailable - diff,
                        allocations: { ...updatedPool.allocations, [masaId]: updates.config.initialCapital }
                    };
                }
            }

            const newState: MultiMasaState = {
                ...prev,
                capitalPool: updatedPool,
                instances: {
                    ...prev.instances,
                    [masaId]: { ...prev.instances[masaId], ...finalUpdates }
                }
            };

            const updatedInst = newState.instances[masaId];
            if (updatedInst?.status === 'active' &&
                updatedInst.currentPlan?.hierarchyType === 'SON' &&
                !updatedInst.missionResultQueued) {
                const sonPlan = updatedInst.currentPlan as MasaPlan;
                const fatherId = sonPlan.fatherPlanId;
                if (fatherId) {
                    const father = newState.instances[fatherId];
                    if (father && father.currentPlan && father.currentPlan.status === 'active') {
                        const totalCurrentWorth = sonPlan.currentCapital + (updatedInst.history || []).reduce((sum, p) => sum + (p.accumulatedAmount || 0), 0);
                        const totalProfit = totalCurrentWorth - updatedInst.absoluteStartCapital;
                        const fatherStake = sonPlan.fatherStake || 0;
                        const requiredFatherProfit = fatherStake * (Math.max(0, (sonPlan.fatherQuota || 1) - 1));
                        const fatherQuota = sonPlan.fatherQuota || 1.25;

                        const isWon = totalProfit >= requiredFatherProfit - 0.01;
                        const sonHasStarted = sonPlan.events.filter(e => !e.isSystemLog).length > 0;
                        const isLost = sonPlan.status === 'failed' || (sonHasStarted && sonPlan.remainingWins > sonPlan.remainingEvents);

                        if (isWon || isLost) {
                            // 1. Mark son as queued to prevent repeat flooding
                            const updatedSon: MasanielloInstance = {
                                ...updatedInst,
                                status: 'archived',
                                archivedAt: new Date().toISOString(),
                                currentPlan: {
                                    ...sonPlan,
                                    status: isWon ? 'success' : 'failed'
                                },
                                missionResultQueued: isWon ? 'win' : 'loss'
                            };

                            // 2. Resolve Father DIRECTLY in state
                            const sonWorth = sonPlan.currentCapital;
                            const newCapital = roundTwo(father.currentPlan.currentCapital + sonWorth);

                            const nextEventId = (father.currentPlan.events || []).filter(e => !e.isSystemLog).length + 1;
                            const newEvent: MasaEvent = {
                                id: nextEventId,
                                stake: fatherStake,
                                isWin: isWon,
                                isVoid: false,
                                isPartialSequence: false,
                                isHierarchySummary: true, // Mark as summary to avoid double counting raw events
                                capitalAfter: newCapital,
                                eventsLeft: father.currentPlan.remainingEvents - 1,
                                winsLeft: isWon ? father.currentPlan.remainingWins - 1 : father.currentPlan.remainingWins,
                                timestamp: new Date().toISOString(),
                                quota: fatherQuota,
                                message: isWon ? 'DELEGA VINTA (AUTO)' : 'DELEGA PERSA (AUTO)'
                            };

                            const newAllocations = { ...newState.capitalPool.allocations };
                            delete newAllocations[masaId];
                            newAllocations[fatherId] = newCapital;

                            newState.activeInstanceIds = newState.activeInstanceIds.filter(id => id !== masaId);
                            newState.archivedInstanceIds = [...newState.archivedInstanceIds, masaId];
                            newState.instances[masaId] = updatedSon;
                            newState.instances[fatherId] = {
                                ...father,
                                sonsCompleted: isWon ? (father.sonsCompleted || 0) + 1 : (father.sonsCompleted || 0),
                                sonsFailed: isLost ? (father.sonsFailed || 0) + 1 : (father.sonsFailed || 0),
                                lastSonConfig: updatedInst.config,
                                currentPlan: {
                                    ...father.currentPlan,
                                    currentCapital: newCapital,
                                    events: [...father.currentPlan.events, newEvent],
                                    remainingEvents: father.currentPlan.remainingEvents - 1,
                                    remainingWins: isWon ? father.currentPlan.remainingWins - 1 : father.currentPlan.remainingWins,
                                    wins: isWon ? father.currentPlan.wins + 1 : father.currentPlan.wins,
                                    losses: isWon ? father.currentPlan.losses : father.currentPlan.losses + 1,
                                }
                            };
                            newState.capitalPool.allocations = newAllocations;
                        }
                    }
                }
            }

            return newState;
        });
    }, []);

    // Spawn a Son plan from a Father's event
    const spawnSonPlan = useCallback((fatherId: string, fatherQuota: number) => {
        setMultiState(prev => {
            const fatherInstance = prev.instances[fatherId];
            if (!fatherInstance || !fatherInstance.currentPlan) return prev;

            const fatherPlan = fatherInstance.currentPlan;
            const stakeValueRaw = calculateStake(fatherPlan.currentCapital, fatherPlan.remainingEvents, fatherPlan.remainingWins, fatherQuota, fatherPlan.targetCapital, fatherPlan.maxConsecutiveLosses || 0, fatherPlan.currentConsecutiveLosses || 0);
            const stakeValue = Math.ceil(stakeValueRaw);

            if (stakeValue <= 1) {
                alert("Stake troppo basso (€" + stakeValue.toFixed(2) + ") per generare un figlio.");
                return prev;
            }

            const winPotential = stakeValue * (fatherQuota - 1);
            const sonTarget = roundTwo(stakeValue + winPotential);

            const existingNumbers = Object.values(prev.instances).map(i => i.number);
            let nextNumber = 1;
            while (existingNumbers.includes(nextNumber)) { nextNumber++; }
            const newId = `masa_${nextNumber}`;

            const sonConfig: Config = fatherInstance.lastSonConfig ? {
                ...fatherInstance.lastSonConfig,
                initialCapital: stakeValue,
                fatherPlanId: fatherId,
                fatherStake: stakeValue,
                fatherQuota: fatherQuota,
                hierarchyType: 'SON'
            } : {
                initialCapital: stakeValue,
                quota: 1.25,
                totalEvents: 10,
                expectedWins: 7,
                accumulationPercent: 0,
                weeklyTargetPercentage: 0,
                milestoneBankPercentage: 0,
                role: 'standard',
                hierarchyType: 'SON',
                fatherPlanId: fatherId,
                fatherStake: stakeValue,
                fatherQuota: fatherQuota
            };

            const initialPlan = createInitialPlan(sonConfig, stakeValue);
            // Set maxNetProfit to match the mission target (father's required return)
            // so the plan's internal math is consistent with the mission
            const sonMaxNetProfit = sonTarget - stakeValue;
            const sonInstance: MasanielloInstance = {
                id: newId,
                number: nextNumber,
                name: `Masa Figlio (Padre #${fatherInstance.number})`,
                status: 'active',
                config: sonConfig,
                activeRules: ['impossible'],
                currentPlan: {
                    ...initialPlan,
                    hierarchyType: 'SON',
                    fatherPlanId: fatherId,
                    fatherEventId: `EVENT_${fatherPlan.events.length + 1}`,
                    targetCapital: sonTarget,
                    maxNetProfit: sonMaxNetProfit,
                    fatherStake: stakeValue,
                    fatherQuota: fatherQuota
                },
                history: [],
                absoluteStartCapital: stakeValue,
                createdAt: new Date().toISOString()
            };

            const updatedFather: MasanielloInstance = {
                ...fatherInstance,
                currentPlan: {
                    ...fatherPlan,
                    currentCapital: roundTwo(fatherPlan.currentCapital - stakeValue)
                }
            };

            const updatedPool = {
                ...prev.capitalPool,
                allocations: {
                    ...prev.capitalPool.allocations,
                    [fatherId]: roundTwo((prev.capitalPool.allocations[fatherId] || 0) - stakeValue),
                    [newId]: stakeValue
                },
                history: [...prev.capitalPool.history, {
                    id: `tx_${Date.now()}_spawn`,
                    timestamp: new Date().toISOString(),
                    type: 'allocation' as const,
                    amount: stakeValue,
                    description: `Allocazione interna per Masa Figlio da Padre #${fatherInstance.number}`,
                    fromMasaId: fatherId,
                    toMasaId: newId
                }]
            };

            return {
                ...prev,
                capitalPool: updatedPool,
                instances: {
                    ...prev.instances,
                    [fatherId]: updatedFather,
                    [newId]: sonInstance
                },
                activeInstanceIds: [...prev.activeInstanceIds, newId],
                currentViewId: newId
            };
        });
    }, []);

    // Manual resolution of a mission
    // Manual resolution of a mission
    const resolveSonMission = useCallback((sonId: string, isWin: boolean) => {
        console.log(`[MultiMasa] Resolving mission for ${sonId}, Win: ${isWin}`);
        setMultiState(prev => {
            const sonInstance = prev.instances[sonId];
            if (!sonInstance || !sonInstance.currentPlan) {
                console.warn("[MultiMasa] Son or plan missing", sonId);
                return prev;
            }

            const sonPlan = sonInstance.currentPlan;
            const fatherId = sonPlan.fatherPlanId;

            // IF ALREADY ARCHIVED: Just switch to Father view without re-resolving
            if (sonInstance.status === 'archived' && fatherId) {
                return {
                    ...prev,
                    currentViewId: fatherId
                };
            }

            if (sonInstance.status !== 'active') return prev;
            if (!fatherId) {
                console.warn("[MultiMasa] fatherPlanId missing in Son plan", sonId, "Hierarchy:", sonPlan.hierarchyType);
                return prev;
            }

            const father = prev.instances[fatherId];
            if (!father || !father.currentPlan) {
                console.warn("[MultiMasa] Father instance or plan missing", fatherId);
                return prev;
            }

            // 1. Calculate resolution params
            const sonWorth = sonPlan.currentCapital;
            const fatherQuota = sonPlan.fatherQuota || 1.25;
            const fatherStake = sonPlan.fatherStake || sonPlan.startCapital || 0;

            const newCapital = roundTwo(father.currentPlan.currentCapital + sonWorth);

            const nextEventId = (father.currentPlan.events || []).filter(e => !e.isSystemLog).length + 1;
            const newEvent: MasaEvent = {
                id: nextEventId,
                stake: fatherStake,
                isWin: isWin,
                isVoid: false,
                isPartialSequence: false,
                isHierarchySummary: true, // Mark as summary
                capitalAfter: newCapital,
                eventsLeft: father.currentPlan.remainingEvents - 1,
                winsLeft: isWin ? father.currentPlan.remainingWins - 1 : father.currentPlan.remainingWins,
                timestamp: new Date().toISOString(),
                quota: fatherQuota,
                message: isWin ? 'DELEGA VINTA (MANUALE)' : 'DELEGA PERSA (MANUALE)'
            };

            // 2. Resolve Father DIRECTLY
            const updatedFather = {
                ...father,
                sonsCompleted: isWin ? (father.sonsCompleted || 0) + 1 : (father.sonsCompleted || 0),
                sonsFailed: !isWin ? (father.sonsFailed || 0) + 1 : (father.sonsFailed || 0),
                currentPlan: {
                    ...father.currentPlan,
                    currentCapital: newCapital,
                    events: [...father.currentPlan.events, newEvent],
                    remainingEvents: father.currentPlan.remainingEvents - 1,
                    remainingWins: isWin ? father.currentPlan.remainingWins - 1 : father.currentPlan.remainingWins,
                    wins: isWin ? father.currentPlan.wins + 1 : father.currentPlan.wins,
                    losses: isWin ? father.currentPlan.losses : father.currentPlan.losses + 1,
                }
            };

            // 3. Mark Son as success/failed and Archive it
            const updatedSon: MasanielloInstance = {
                ...sonInstance,
                status: 'archived',
                archivedAt: new Date().toISOString(),
                currentPlan: {
                    ...sonPlan,
                    status: isWin ? 'success' : 'failed'
                },
                missionResultQueued: isWin ? 'win' : 'loss' // Set the flag here
            };

            const transaction: CapitalPoolTransaction = {
                id: `tx_${Date.now()}_son_res`,
                timestamp: new Date().toISOString(),
                type: 'transfer' as const,
                amount: sonWorth,
                fromMasaId: sonId,
                toMasaId: fatherId,
                description: `Risoluzione Missione Figlio -> Ritorno capitale al Padre`
            };

            const newAllocations = { ...prev.capitalPool.allocations };
            delete newAllocations[sonId];
            newAllocations[fatherId] = (newAllocations[fatherId] || 0) + sonWorth;

            // 5. Update multiState
            return {
                ...prev,
                instances: {
                    ...prev.instances,
                    [fatherId]: updatedFather,
                    [sonId]: updatedSon
                },
                capitalPool: {
                    ...prev.capitalPool,
                    allocations: newAllocations,
                    history: [...prev.capitalPool.history, transaction]
                },
                activeInstanceIds: prev.activeInstanceIds.filter(id => id !== sonId),
                archivedInstanceIds: [...prev.archivedInstanceIds, sonId],
                currentViewId: fatherId // Switch back to Father
            };
        });
    }, []);

    // Feed a slave plan from a master plan
    const feedSlave = useCallback((masterId: string, amount: number) => {
        setMultiState(prev => {
            const master = prev.instances[masterId];
            if (!master || master.config.role !== 'master' || !master.config.feedForwardConfig?.slavePlanId) return prev;

            const slaveId = master.config.feedForwardConfig.slavePlanId;
            const slave = prev.instances[slaveId];
            if (!slave || slave.config.role !== 'slave' || !slave.config.feedSource) return prev;

            const newBuffer = (slave.config.feedSource.virtualBuffer || 0) + amount;
            const slavePlan = slave.currentPlan;

            const updatedSlaveConfig = {
                ...slave.config,
                feedSource: {
                    ...slave.config.feedSource,
                    virtualBuffer: newBuffer,
                    isPaused: newBuffer <= 0
                }
            };

            const updatedSlave: MasanielloInstance = { ...slave, config: updatedSlaveConfig };

            if (slavePlan) {
                const hasNoEvents = !slavePlan.events || slavePlan.events.filter(e => !e.isSystemLog).length === 0;
                if (hasNoEvents) {
                    const maxProfit = calculateMaxNetProfit(newBuffer, slavePlan.totalEvents, slavePlan.expectedWins, slavePlan.quota, slavePlan.maxConsecutiveLosses || 0);
                    updatedSlave.currentPlan = {
                        ...slavePlan,
                        startCapital: newBuffer,
                        currentCapital: newBuffer,
                        targetCapital: newBuffer + maxProfit,
                        maxNetProfit: maxProfit,
                        currentWeeklyTarget: newBuffer * (1 + (slave.config.weeklyTargetPercentage || 20) / 100),
                        feedSource: { ...slavePlan.feedSource!, virtualBuffer: newBuffer, isPaused: newBuffer <= 0 }
                    };
                } else {
                    updatedSlave.currentPlan = {
                        ...slavePlan,
                        currentCapital: newBuffer,
                        feedSource: { ...slavePlan.feedSource!, virtualBuffer: newBuffer, isPaused: newBuffer <= 0 }
                    };
                }
            }

            return { ...prev, instances: { ...prev.instances, [slaveId]: updatedSlave } };
        });
    }, []);

    const feedBackToMaster = useCallback((slaveId: string, amount: number) => {
        setMultiState(prev => {
            const slave = prev.instances[slaveId];
            if (!slave || slave.config.role !== 'slave' || !slave.config.feedSource?.masterPlanId) return prev;

            const masterId = slave.config.feedSource.masterPlanId;
            const master = prev.instances[masterId];
            if (!master) return prev;

            const masterPlan = master.currentPlan;
            if (!masterPlan) return prev;

            const newMasterCapital = roundTwo(masterPlan.currentCapital + amount);
            const updatedMaster: MasanielloInstance = {
                ...master,
                currentPlan: {
                    ...masterPlan,
                    currentCapital: newMasterCapital,
                    events: [...(masterPlan.events || []), {
                        id: `FEED_BACK_RCV_${Date.now()}`,
                        stake: 0, isWin: false, isVoid: true, isPartialSequence: false, isSystemLog: true,
                        message: `RECOVERY: Ricevuti €${amount} di profitto dallo Slave`,
                        capitalAfter: newMasterCapital,
                        eventsLeft: masterPlan.remainingEvents,
                        winsLeft: masterPlan.remainingWins,
                        timestamp: new Date().toISOString(),
                        quota: masterPlan.quota,
                    }]
                }
            };

            return { ...prev, instances: { ...prev.instances, [masterId]: updatedMaster } };
        });
    }, []);

    const setCurrentView = useCallback((viewId: string) => {
        setMultiState(prev => ({ ...prev, currentViewId: viewId }));
    }, []);

    const savePlanLog = useCallback((masaId: string, plan: MasaPlan) => {
        setMultiState(prev => {
            const instance = prev.instances[masaId];
            if (!instance) return prev;

            const newLog = {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                instanceName: instance.name,
                instanceType: instance.type || 'standard',
                timestamp: new Date().toISOString(),
                plan: JSON.parse(JSON.stringify(plan)) // deep copy
            };

            return {
                ...prev,
                savedLogs: [newLog, ...(prev.savedLogs || [])]
            };
        });
    }, []);

    const deleteSavedLog = useCallback((logId: string) => {
        setMultiState(prev => ({
            ...prev,
            savedLogs: (prev.savedLogs || []).filter(log => log.id !== logId)
        }));
    }, []);

    const resetGlobalStats = useCallback(() => {
        setMultiState(prev => {
            let activeWins = 0;
            let activeLosses = 0;

            Object.values(prev.instances).forEach(inst => {
                const allPlans = [...inst.history];
                if (inst.currentPlan) allPlans.push(inst.currentPlan);
                allPlans.forEach(p => {
                    p.events.forEach(e => {
                        if (!e.isSystemLog && !e.isVoid && !(e as any).isHierarchySummary) {
                            if (e.isWin) activeWins++; else activeLosses++;
                        }
                    });
                });
            });

            const currentTotalWins = activeWins + (prev.capitalPool.lifetimeWins || 0);
            const currentTotalLosses = activeLosses + (prev.capitalPool.lifetimeLosses || 0);

            return {
                ...prev,
                capitalPool: {
                    ...prev.capitalPool,
                    resetWinsOffset: currentTotalWins,
                    resetLossesOffset: currentTotalLosses,
                    resetTargetsOffset: Object.values(prev.instances).reduce((sum, inst) => {
                        const historyTargets = (inst.history || []).reduce((hSum, p) => hSum + (p.weeklyTargetsReached || 0), 0);
                        const currentTargets = inst.currentPlan?.weeklyTargetsReached || 0;
                        return sum + historyTargets + currentTargets;
                    }, 0)
                }
            };
        });
    }, []);

    const aggregatedStats = useMemo((): AggregatedStats => {
        let totalWorth = multiState.capitalPool.totalAvailable;
        let totalBanked = 0;
        let totalWins = 0;
        let totalLosses = 0;
        const combinedChartData: ChartDataPoint[] = [];
        const timelineEvents: { timestamp: string; masaId: string }[] = [];
        let totalWeeklyTargetsReached = 0;


        // Count stats from ALL instances currently in state (active + archived)
        Object.values(multiState.instances).forEach(instance => {
            if (!instance) return;
            let instanceWorth = 0;
            if (instance.status === 'active') {
                let historyProfits = 0;
                let currentProfits = 0;

                if (instance.type === 'twin' && instance.twinState) {
                    const hl = instance.twinState.historyLong || [];
                    const hs = instance.twinState.historyShort || [];
                    historyProfits = hl.reduce((sum, p) => sum + (p.currentCapital - p.startCapital), 0) +
                        hs.reduce((sum, p) => sum + (p.currentCapital - p.startCapital), 0);

                    currentProfits = (instance.twinState.planLong.currentCapital - instance.twinState.planLong.startCapital) +
                        (instance.twinState.planShort.currentCapital - instance.twinState.planShort.startCapital);
                } else {
                    historyProfits = instance.history.reduce((sum, p) => sum + (p.currentCapital - p.startCapital), 0);
                    if (instance.type === 'differential' && instance.differentialState) {
                        currentProfits = (instance.differentialState.realCapital || instance.absoluteStartCapital) - instance.absoluteStartCapital;
                    } else if (instance.currentPlan) {
                        currentProfits = instance.currentPlan.currentCapital - instance.currentPlan.startCapital;
                    }
                }

                instanceWorth = instance.absoluteStartCapital + historyProfits + currentProfits;
                totalWorth += instanceWorth;
            }

            const banked = instance.history.reduce((sum: number, plan: any) => sum + (plan.accumulatedAmount || 0), 0);
            totalBanked += banked;

            const instanceTargets = (instance.history || []).reduce((sum: number, p: any) => sum + (p.weeklyTargetsReached || 0), 0) + (instance.currentPlan?.weeklyTargetsReached || 0);
            totalWeeklyTargetsReached += instanceTargets;

            const allPlans = [...instance.history];
            if (instance.type === 'twin' && instance.twinState) {
                allPlans.push(instance.twinState.planLong);
                allPlans.push(instance.twinState.planShort);
            } else if (instance.type === 'differential' && instance.differentialState) {
                allPlans.push(instance.differentialState.planA);
                allPlans.push(instance.differentialState.planB);
            } else if (instance.currentPlan) {
                allPlans.push(instance.currentPlan);
            }

            allPlans.forEach(plan => {
                plan.events.forEach(event => {
                    timelineEvents.push({ timestamp: event.timestamp, masaId: instance.id });
                    if (!event.isSystemLog && !event.isVoid && !(event as any).isHierarchySummary) {
                        if (event.isWin) totalWins++;
                        else totalLosses++;
                    }
                });
            });


        });

        const sortedTimeline = timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const instanceWorths: Record<string, number> = {};

        sortedTimeline.forEach((event, idx) => {
            const instance = multiState.instances[event.masaId];
            if (!instance) return;
            const allPlans = [...instance.history];
            if (instance.currentPlan) allPlans.push(instance.currentPlan);
            let latestEvent = null;
            let bankedAtTime = 0;

            for (const plan of allPlans) {
                const planEvents = plan.events.filter(e => new Date(e.timestamp).getTime() <= new Date(event.timestamp).getTime());
                if (planEvents.length > 0) latestEvent = planEvents[planEvents.length - 1];
                if (plan.status !== 'active' && new Date(plan.createdAt).getTime() <= new Date(event.timestamp).getTime()) bankedAtTime += (plan.accumulatedAmount || 0);
            }

            const activeCap = latestEvent ? latestEvent.capitalAfter : instance.absoluteStartCapital;
            instanceWorths[event.masaId] = activeCap + bankedAtTime;
            const totalAtPoint = Object.values(instanceWorths).reduce((sum, w) => sum + w, 0);

            if (idx % Math.max(1, Math.floor(sortedTimeline.length / 50)) === 0 || idx === sortedTimeline.length - 1) {
                combinedChartData.push({ name: new Date(event.timestamp).toLocaleDateString(), capital: totalAtPoint, days: (new Date(event.timestamp).getTime() - new Date(sortedTimeline[0].timestamp).getTime()) / (1000 * 60 * 60 * 24), cycle: idx });
            }
        });

        const totalInitialCapital = multiState.capitalPool.totalDeposited > 0
            ? multiState.capitalPool.totalDeposited
            : Object.values(multiState.instances)
                .reduce((sum, i) => sum + i.absoluteStartCapital, 0) + multiState.capitalPool.totalAvailable;

        // Final adjustment: if everything is archived and pool is empty, we must have at least the deposited amount 
        // to avoid ROI jumping to infinity.
        const effectiveInitial = totalInitialCapital || 1000;

        // Add lifetime stats from deleted plans and apply offsets
        const finalWins = Math.max(0, totalWins + (multiState.capitalPool.lifetimeWins || 0) - (multiState.capitalPool.resetWinsOffset || 0));
        const finalLosses = Math.max(0, totalLosses + (multiState.capitalPool.lifetimeLosses || 0) - (multiState.capitalPool.resetLossesOffset || 0));

        const totalDays = Math.ceil((finalWins + finalLosses) / 2.5);

        return {
            totalInitialCapital: effectiveInitial,
            totalWorth,
            totalBanked,
            totalProfit: totalWorth - effectiveInitial,
            totalGrowth: effectiveInitial > 0 ? ((totalWorth - effectiveInitial) / effectiveInitial) * 100 : 0,
            totalWins: finalWins,
            totalLosses: finalLosses,
            totalWeeklyTargetsReached: Math.max(0, totalWeeklyTargetsReached - (multiState.capitalPool.resetTargetsOffset || 0)),
            totalDays: Math.max(0, totalDays),
            combinedChartData
        };
    }, [multiState]);

    return {
        multiState, createMasaniello, archiveMasaniello, deleteMasaniello, cloneMasaniello, addCapitalToPool, setAvailableCapital,
        updateInstance, resetMasaniello, feedSlave, feedBackToMaster, setCurrentView, aggregatedStats, resetGlobalStats,
        savePlanLog, deleteSavedLog,
        canCreateNew: multiState.activeInstanceIds.length < MAX_ACTIVE_INSTANCES,
        spawnSonPlan,
        resolveSonMission,
        resetSystem: useCallback(() => {
            if (window.confirm('Sei sicuro di voler resettare il sistema? I Masanielli verranno azzerati e il capitale totale riportato a €1.000.')) {
                setMultiState(prev => {
                    const newInstances: { [id: string]: MasanielloInstance } = {};

                    Object.entries(prev.instances).forEach(([id, inst]) => {
                        const resetPlan = createInitialPlan(inst.config, 0);
                        newInstances[id] = {
                            ...inst,
                            status: inst.status,
                            currentPlan: (inst.config.role === 'differential' || inst.config.role === 'twin') ? null : resetPlan,
                            history: [],
                            absoluteStartCapital: 0,
                            globalWeeklyTargetsReached: 0,
                            persistentWeeklyTarget: undefined,
                            persistentWeeklyBaseline: undefined,
                            sonsCompleted: 0,
                            sonsFailed: 0,
                            missionResultQueued: null,
                            differentialState: inst.config.role === 'differential' ? {
                                planA: createInitialPlan(inst.config, 0),
                                planB: createInitialPlan(inst.config, 0),
                                status: 'active',
                                realCapital: 0,
                                history: []
                            } : undefined,
                            twinState: inst.config.role === 'twin' ? {
                                planLong: createInitialPlan(inst.config, 0),
                                planShort: createInitialPlan(inst.config, 0),
                                historyLong: [],
                                historyShort: [],
                                activeSide: null
                            } : undefined
                        };
                    });

                    return {
                        ...prev,
                        instances: newInstances,
                        capitalPool: {
                            totalAvailable: 1000,
                            totalDeposited: 1000,
                            allocations: {},
                            history: [{
                                id: `tx_${Date.now()}_sys_reset`,
                                timestamp: new Date().toISOString(),
                                type: 'transfer' as const,
                                amount: 1000,
                                description: 'RESET SISTEMA: Masanielli azzerati e capitale riportato a €1.000'
                            }],
                            lifetimeWins: 0,
                            lifetimeLosses: 0,
                            resetWinsOffset: 0,
                            resetLossesOffset: 0,
                            resetTargetsOffset: 0
                        },
                        currentViewId: 'overview'
                    };
                });
            }
        }, [createInitialPlan])
    };
};
