import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
    MasanielloInstance,
    MultiMasaState,
    CapitalPool,
    CapitalPoolTransaction,
    AggregatedStats,
    Config,
    ChartDataPoint
} from '../types/masaniello';
import { createInitialPlan } from '../utils/masaLogic';
import { calculateMaxNetProfit } from '../utils/mathUtils';

const STORAGE_KEY = 'multi_masaniello_state';
const MAX_ACTIVE_INSTANCES = 3;

const createEmptyCapitalPool = (): CapitalPool => ({
    totalAvailable: 0,
    allocations: {},
    history: []
});

const createDefaultMultiState = (): MultiMasaState => ({
    instances: {},
    capitalPool: createEmptyCapitalPool(),
    activeInstanceIds: [],
    archivedInstanceIds: [],
    currentViewId: 'overview'
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
            const capitalToAllocate = initialCapital || config.initialCapital;

            // Check if pool has enough capital
            if (capitalToAllocate > prev.capitalPool.totalAvailable) {
                alert(`Capitale insufficiente nel pool. Disponibile: €${prev.capitalPool.totalAvailable.toFixed(2)}`);
                return prev;
            }

            // Create the first plan automatically
            const initialPlan = createInitialPlan(config, capitalToAllocate);

            const newInstance: MasanielloInstance = {
                id: newId,
                number: nextNumber,
                name: `Masaniello #${nextNumber}`,
                status: 'active',
                config,
                activeRules: activeRules || [],
                currentPlan: initialPlan,
                history: [],
                absoluteStartCapital: capitalToAllocate,
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
                    totalAvailable: prev.capitalPool.totalAvailable - capitalToAllocate,
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
            if (!instance) return prev;

            // Calculate capital to release
            const currentCapital = instance.currentPlan?.currentCapital || instance.absoluteStartCapital;
            const bankedAmount = instance.history.reduce((sum, plan) => sum + (plan.accumulatedAmount || 0), 0);
            const totalCapital = currentCapital + bankedAmount;

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
                    totalAvailable: prev.capitalPool.totalAvailable + totalCapital,
                    allocations: newAllocations,
                    history: [...prev.capitalPool.history, transaction]
                },
                activeInstanceIds: prev.activeInstanceIds.filter(id => id !== masaId),
                archivedInstanceIds: [...prev.archivedInstanceIds, masaId],
                currentViewId: 'new' // Switch to new Masaniello creation
            };
        });
    }, []);

    // Delete a Masaniello instance (permanently)
    const deleteMasaniello = useCallback((masaId: string) => {
        setMultiState(prev => {
            const instance = prev.instances[masaId];
            if (!instance) return prev;

            let updatedPool = { ...prev.capitalPool };

            // If it was an active instance, release its current capital back to pool
            if (prev.activeInstanceIds.includes(masaId)) {
                const currentCapitalValue = instance.currentPlan?.currentCapital || instance.absoluteStartCapital;
                const bankedAmountAtHand = instance.history.reduce((sum, plan) => sum + (plan.accumulatedAmount || 0), 0);
                const totalReleased = currentCapitalValue + bankedAmountAtHand;

                const transaction: CapitalPoolTransaction = {
                    id: `tx_${Date.now()}_del`,
                    timestamp: new Date().toISOString(),
                    type: 'release',
                    amount: totalReleased,
                    fromMasaId: masaId,
                    description: `Capitale recuperato da ${instance.name} (eliminato)`
                };

                const newAllocations = { ...updatedPool.allocations };
                delete newAllocations[masaId];

                updatedPool = {
                    totalAvailable: updatedPool.totalAvailable + totalReleased,
                    allocations: newAllocations,
                    history: [...updatedPool.history, transaction]
                };
            }

            const newInstances = { ...prev.instances };
            delete newInstances[masaId];

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

            const resetInstance: MasanielloInstance = {
                ...instance,
                currentPlan: createInitialPlan(instance.config, instance.absoluteStartCapital),
                history: [],
                activeRules: []
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
                    ? `Capitale disponibile aumentato di €${difference.toFixed(2)}`
                    : `Capitale disponibile ridotto di €${Math.abs(difference).toFixed(2)}`
            };

            return {
                ...prev,
                capitalPool: {
                    ...prev.capitalPool,
                    totalAvailable: newAmount,
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

            // If config is being updated, check if it's actually different
            if (updates.config && JSON.stringify(updates.config) !== JSON.stringify(instance.config)) {
                const newConfig = updates.config as Config;
                // Use the incoming plan if provided, otherwise use the existing one
                const plan = updates.currentPlan || instance.currentPlan;

                if (plan) {
                    const hasStarted = plan.events.filter(e => !e.isSystemLog).length > 0;

                    if (!hasStarted) {
                        const maxProfit = calculateMaxNetProfit(
                            newConfig.initialCapital,
                            newConfig.totalEvents,
                            newConfig.expectedWins,
                            newConfig.quota,
                            newConfig.maxConsecutiveLosses || 0
                        );

                        finalUpdates.currentPlan = {
                            ...plan,
                            startCapital: newConfig.initialCapital,
                            currentCapital: newConfig.initialCapital,
                            targetCapital: newConfig.initialCapital + maxProfit,
                            maxNetProfit: maxProfit,
                            quota: newConfig.quota,
                            totalEvents: newConfig.totalEvents,
                            expectedWins: newConfig.expectedWins,
                            remainingEvents: newConfig.totalEvents,
                            remainingWins: newConfig.expectedWins,
                            maxConsecutiveLosses: newConfig.maxConsecutiveLosses,
                            currentWeeklyTarget: newConfig.initialCapital * (1 + (newConfig.weeklyTargetPercentage || 20) / 100),
                            role: newConfig.role,
                            feedForwardConfig: newConfig.feedForwardConfig,
                            feedSource: newConfig.feedSource
                        };
                    } else {
                        const maxProfit = calculateMaxNetProfit(
                            plan.startCapital,
                            newConfig.totalEvents,
                            newConfig.expectedWins,
                            newConfig.quota,
                            newConfig.maxConsecutiveLosses || 0
                        );

                        finalUpdates.currentPlan = {
                            ...plan,
                            targetCapital: plan.startCapital + maxProfit,
                            maxNetProfit: maxProfit,
                            quota: newConfig.quota,
                            totalEvents: newConfig.totalEvents,
                            expectedWins: newConfig.expectedWins,
                            maxConsecutiveLosses: newConfig.maxConsecutiveLosses,
                            role: newConfig.role,
                            feedForwardConfig: newConfig.feedForwardConfig,
                            feedSource: newConfig.feedSource
                        };
                    }
                }
            }

            return {
                ...prev,
                instances: {
                    ...prev.instances,
                    [masaId]: {
                        ...prev.instances[masaId],
                        ...finalUpdates
                    }
                }
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

            const updatedSlave: MasanielloInstance = {
                ...slave,
                config: updatedSlaveConfig
            };

            // Update the current plan to reflect the new buffer as currentCapital
            if (slavePlan) {
                const hasNoEvents = !slavePlan.events || slavePlan.events.filter(e => !e.isSystemLog).length === 0;

                // If the plan hasn't started yet (no events), update start capital and recalculate targets
                if (hasNoEvents) {
                    const maxProfit = calculateMaxNetProfit(
                        newBuffer,
                        slavePlan.totalEvents,
                        slavePlan.expectedWins,
                        slavePlan.quota,
                        slavePlan.maxConsecutiveLosses || 0
                    );

                    updatedSlave.currentPlan = {
                        ...slavePlan,
                        startCapital: newBuffer,
                        currentCapital: newBuffer,
                        targetCapital: newBuffer + maxProfit,
                        maxNetProfit: maxProfit,
                        currentWeeklyTarget: newBuffer * (1 + (slave.config.weeklyTargetPercentage || 20) / 100),
                        feedSource: {
                            ...slavePlan.feedSource!,
                            virtualBuffer: newBuffer,
                            isPaused: newBuffer <= 0
                        }
                    };
                } else {
                    // Plan has already started, just update current capital
                    updatedSlave.currentPlan = {
                        ...slavePlan,
                        currentCapital: newBuffer,
                        feedSource: {
                            ...slavePlan.feedSource!,
                            virtualBuffer: newBuffer,
                            isPaused: newBuffer <= 0
                        }
                    };
                }
            }

            return {
                ...prev,
                instances: {
                    ...prev.instances,
                    [slaveId]: updatedSlave
                }
            };
        });
    }, []);

    // Set current view
    const setCurrentView = useCallback((viewId: string) => {
        setMultiState(prev => ({
            ...prev,
            currentViewId: viewId
        }));
    }, []);

    // Calculate aggregated stats
    const aggregatedStats = useMemo((): AggregatedStats => {
        const activeInstances = multiState.activeInstanceIds
            .map(id => multiState.instances[id])
            .filter(Boolean);

        let totalWorth = 0;
        let totalBanked = 0;
        let totalWins = 0;
        let totalLosses = 0;
        const combinedChartData: ChartDataPoint[] = [];
        const timelineEvents: { timestamp: string; masaId: string }[] = [];

        let totalWeeklyTargetsReached = 0;
        activeInstances.forEach(instance => {
            const currentCaptial = instance.currentPlan?.currentCapital || instance.absoluteStartCapital;
            const banked = instance.history.reduce((sum, plan) => sum + (plan.accumulatedAmount || 0), 0);

            totalWorth += currentCaptial + banked;
            totalBanked += banked;

            // Count weekly targets reached in history (including rollovers)
            totalWeeklyTargetsReached += instance.history.reduce((sum, p) => sum + (p.weeklyTargetsReached || 0), 0);

            // Count wins/losses
            instance.history.forEach(plan => {
                totalWins += plan.wins;
                totalLosses += plan.losses;
            });
            if (instance.currentPlan) {
                totalWins += instance.currentPlan.wins;
                totalLosses += instance.currentPlan.losses;
                totalWeeklyTargetsReached += (instance.currentPlan.weeklyTargetsReached || 0);
            }

            // Initial capital allocation
            timelineEvents.push({
                timestamp: instance.createdAt,
                masaId: instance.id
            });

            // Process history and current plan events
            const allPlans = [...instance.history];
            if (instance.currentPlan) allPlans.push(instance.currentPlan);

            allPlans.forEach(plan => {
                plan.events.forEach(event => {
                    if (event.isSystemLog && event.message?.includes('BANKING')) return;
                    timelineEvents.push({
                        timestamp: event.timestamp,
                        masaId: instance.id
                    });
                });
            });
        });

        // 2. Sort timeline and calculate rolling total
        const sortedTimeline = timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const instanceWorths: Record<string, number> = {};

        sortedTimeline.forEach((event, idx) => {
            const instance = multiState.instances[event.masaId];
            if (!instance) return;

            // Find the state of this instance at this timestamp
            const allPlans = [...instance.history];
            if (instance.currentPlan) allPlans.push(instance.currentPlan);

            // Find the latest event for this instance at or before this timestamp
            let latestEvent = null;
            let bankedAtTime = 0;

            for (const plan of allPlans) {
                const planEvents = plan.events.filter(e => new Date(e.timestamp).getTime() <= new Date(event.timestamp).getTime());
                if (planEvents.length > 0) {
                    latestEvent = planEvents[planEvents.length - 1];
                }
                // Sum banked from completed plans before this timestamp
                if (plan.status !== 'active' && new Date(plan.createdAt).getTime() <= new Date(event.timestamp).getTime()) {
                    bankedAtTime += (plan.accumulatedAmount || 0);
                }
            }

            const activeCap = latestEvent ? latestEvent.capitalAfter : instance.absoluteStartCapital;
            instanceWorths[event.masaId] = activeCap + bankedAtTime;

            const totalAtPoint = Object.values(instanceWorths).reduce((sum, w) => sum + w, 0);

            if (idx % Math.max(1, Math.floor(sortedTimeline.length / 50)) === 0 || idx === sortedTimeline.length - 1) {
                combinedChartData.push({
                    name: new Date(event.timestamp).toLocaleDateString(),
                    capital: totalAtPoint,
                    days: (new Date(event.timestamp).getTime() - new Date(sortedTimeline[0].timestamp).getTime()) / (1000 * 60 * 60 * 24),
                    cycle: idx
                });
            }
        });

        const totalInitialCapital = activeInstances.reduce((sum, i) => sum + i.absoluteStartCapital, 0);
        const totalProfit = totalWorth - totalInitialCapital;
        const totalGrowth = totalInitialCapital > 0 ? (totalProfit / totalInitialCapital) * 100 : 0;

        return {
            totalInitialCapital,
            totalWorth,
            totalBanked,
            totalProfit,
            totalGrowth,
            totalWins,
            totalLosses,
            totalWeeklyTargetsReached,
            combinedChartData
        };
    }, [multiState]);

    return {
        multiState,
        createMasaniello,
        archiveMasaniello,
        deleteMasaniello,
        cloneMasaniello,
        addCapitalToPool,
        setAvailableCapital,
        updateInstance,
        resetMasaniello,
        feedSlave,
        setCurrentView,
        aggregatedStats,
        canCreateNew: multiState.activeInstanceIds.length < MAX_ACTIVE_INSTANCES,
        resetSystem: useCallback(() => {
            if (window.confirm('Sei sicuro di voler resettare l\'intero sistema? Tutti i Masanielli (attivi e archiviati) e il capitale residuo verranno persi definitivamente.')) {
                const defaultState = createDefaultMultiState();
                setMultiState(defaultState);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
                window.location.reload(); // Hard reload to ensure all states are clean
            }
        }, [])
    };
};
