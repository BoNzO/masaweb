import { useEffect } from 'react';
import { useMasaniello } from './useMasaniello';
import type { MasanielloInstance } from '../types/masaniello';

/**
 * Wrapper hook that bridges a single Masaniello instance with the multi-Masaniello system.
 * It uses useMasaniello internally but syncs state with the parent multi-state.
 */
export const useMasanielloInstance = (
    instance: MasanielloInstance,
    onUpdate: (updates: Partial<MasanielloInstance>) => void
) => {
    // Use the standard useMasaniello hook with persistence DISABLED
    const masaniello = useMasaniello(false);

    // Initialize from instance data on mount or when instance ID changes
    useEffect(() => {
        if (!instance) return;

        // Fully rehydrate the state from the instance object
        masaniello.setConfig(instance.config);
        masaniello.setActiveRules(instance.activeRules || []);
        masaniello.setHistory(instance.history || []);

        // Rehydrate plans dictionary and current plan ID
        if (instance.currentPlan) {
            masaniello.setPlans({ [instance.currentPlan.id]: instance.currentPlan });
            masaniello.setActivePlanId(String(instance.currentPlan.id));
        } else {
            masaniello.setPlans({});
            masaniello.setActivePlanId(null);
        }
    }, [instance.id]);

    // Sync changes back to parent whenever internal state changes
    useEffect(() => {
        if (!instance) return;

        // Check if there's any actual change before calling onUpdate
        const hasConfigChanged = JSON.stringify(masaniello.config) !== JSON.stringify(instance.config);
        const hasHistoryChanged = JSON.stringify(masaniello.history) !== JSON.stringify(instance.history);
        const hasRulesChanged = JSON.stringify(masaniello.activeRules) !== JSON.stringify(instance.activeRules);
        const hasPlanChanged = JSON.stringify(masaniello.currentPlan) !== JSON.stringify(instance.currentPlan);

        if (hasConfigChanged || hasHistoryChanged || hasRulesChanged || hasPlanChanged) {
            onUpdate({
                config: masaniello.config,
                currentPlan: masaniello.currentPlan,
                history: masaniello.history,
                activeRules: masaniello.activeRules
            });
        }
    }, [
        masaniello.config,
        masaniello.currentPlan,
        masaniello.history,
        masaniello.activeRules,
        onUpdate,
        instance.config,
        instance.history,
        instance.activeRules,
        instance.currentPlan
    ]);

    return masaniello;
};
