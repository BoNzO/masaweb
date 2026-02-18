import { useEffect, useRef } from 'react';
import { useMasaniello } from './useMasaniello';
import type { MasanielloInstance } from '../types/masaniello';

/**
 * Wrapper hook that bridges a single Masaniello instance with the multi-Masaniello system.
 * It uses useMasaniello internally but syncs state with the parent multi-state.
 */
export const useMasanielloInstance = (
    instance: MasanielloInstance,
    onUpdate: (updates: Partial<MasanielloInstance>) => void,
    onFeedTriggered?: (amount: number) => void,
    onBufferUpdate?: (newBuffer: number) => void
) => {
    // Use the standard useMasaniello hook with persistence DISABLED
    const masaniello = useMasaniello(false, onFeedTriggered, onBufferUpdate);

    // Ref to track if the current update is coming from the parent to avoid sync loops
    const isExternalUpdating = useRef(false);

    // 1. Initial rehydration on mount/ID change
    useEffect(() => {
        if (!instance) return;

        isExternalUpdating.current = true;
        masaniello.setConfig(instance.config);
        masaniello.setActiveRules(instance.activeRules || []);
        masaniello.setHistory(instance.history || []);

        if (instance.currentPlan) {
            masaniello.setPlans({ [instance.currentPlan.id]: instance.currentPlan });
            masaniello.setActivePlanId(String(instance.currentPlan.id));
        } else {
            masaniello.setPlans({});
            masaniello.setActivePlanId(null);
        }

        const timeout = setTimeout(() => {
            isExternalUpdating.current = false;
        }, 50);
        return () => clearTimeout(timeout);
    }, [instance.id]);

    // External change detection: parent -> child
    useEffect(() => {
        if (!instance) return;

        const hasConfigDiff = JSON.stringify(instance.config) !== JSON.stringify(masaniello.config);
        const hasHistoryDiff = JSON.stringify(instance.history) !== JSON.stringify(masaniello.history);
        const hasRulesDiff = JSON.stringify(instance.activeRules) !== JSON.stringify(masaniello.activeRules);
        const hasPlanDiff = instance.currentPlan && JSON.stringify(instance.currentPlan) !== JSON.stringify(masaniello.currentPlan);

        if (hasConfigDiff || hasHistoryDiff || hasRulesDiff || hasPlanDiff) {
            isExternalUpdating.current = true;

            if (hasConfigDiff) masaniello.setConfig(instance.config);
            if (hasHistoryDiff) masaniello.setHistory(instance.history || []);
            if (hasRulesDiff) masaniello.setActiveRules(instance.activeRules || []);
            if (hasPlanDiff && instance.currentPlan) {
                masaniello.setPlans(prev => ({ ...prev, [instance.currentPlan!.id]: instance.currentPlan! }));
                masaniello.setActivePlanId(String(instance.currentPlan.id));
            }

            const timeout = setTimeout(() => {
                isExternalUpdating.current = false;
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [instance.config, instance.currentPlan, instance.activeRules, instance.history]);

    // 3. Sync changes back to parent: child -> parent
    useEffect(() => {
        if (!instance || isExternalUpdating.current) return;

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
        onUpdate
    ]);

    return masaniello;
};
