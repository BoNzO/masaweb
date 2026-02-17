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

            const newInstance: MasanielloInstance = {
                id: newId,
                number: nextNumber,
                name: `Masaniello #${nextNumber}`,
                status: 'active',
                config,
                activeRules: activeRules || ['first_win', 'back_positive', 'auto_bank_100'],
                currentPlan: null,
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

            return {
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
            const newInstances = { ...prev.instances };
            delete newInstances[masaId];

            return {
                ...prev,
                instances: newInstances,
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

    // Update instance (used by individual Masaniello hooks)
    const updateInstance = useCallback((masaId: string, updates: Partial<MasanielloInstance>) => {
        setMultiState(prev => ({
            ...prev,
            instances: {
                ...prev.instances,
                [masaId]: {
                    ...prev.instances[masaId],
                    ...updates
                }
            }
        }));
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

        activeInstances.forEach(instance => {
            const currentCaptial = instance.currentPlan?.currentCapital || instance.absoluteStartCapital;
            const banked = instance.history.reduce((sum, plan) => sum + (plan.accumulatedAmount || 0), 0);

            totalWorth += currentCaptial + banked;
            totalBanked += banked;

            // Count wins/losses
            instance.history.forEach(plan => {
                totalWins += plan.wins;
                totalLosses += plan.losses;
            });
            if (instance.currentPlan) {
                totalWins += instance.currentPlan.wins;
                totalLosses += instance.currentPlan.losses;
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
            totalWorth,
            totalBanked,
            totalProfit,
            totalGrowth,
            totalWins,
            totalLosses,
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
        updateInstance,
        setCurrentView,
        aggregatedStats,
        canCreateNew: multiState.activeInstanceIds.length < MAX_ACTIVE_INSTANCES
    };
};
