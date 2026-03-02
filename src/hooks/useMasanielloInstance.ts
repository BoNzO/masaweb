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
    onBufferUpdate?: (newBuffer: number) => void,
    onFeedBackTriggered?: (amount: number) => void
) => {
    // Use the standard useMasaniello hook with persistence DISABLED
    const masaniello = useMasaniello(false, onFeedTriggered, onBufferUpdate, onFeedBackTriggered);

    // Ref to track if the current update is coming from the parent to avoid sync loops
    const isExternalUpdating = useRef(false);
    const isProcessingAction = useRef(false);

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

    // 2. Rehydration from parent (External -> Hook)
    useEffect(() => {
        if (!instance || isProcessingAction.current) return;

        const currentMasa = masaniello.config;
        const currentHookPlan = masaniello.currentPlan;

        const hasConfigDiff = JSON.stringify(instance.config) !== JSON.stringify(currentMasa);
        const hasHistoryDiff = JSON.stringify(instance.history) !== JSON.stringify(masaniello.history);
        const hasRulesDiff = JSON.stringify(instance.activeRules) !== JSON.stringify(masaniello.activeRules);
        const hasPlanIdDiff = instance.currentPlan?.id !== currentHookPlan?.id;
        const hasPlanContentDiff = instance.currentPlan && JSON.stringify(instance.currentPlan) !== JSON.stringify(currentHookPlan);

        if (hasConfigDiff || hasHistoryDiff || hasRulesDiff || hasPlanIdDiff || hasPlanContentDiff) {
            isExternalUpdating.current = true;

            if (hasConfigDiff) masaniello.setConfig(instance.config);
            if (hasHistoryDiff) masaniello.setHistory(instance.history || []);
            if (hasRulesDiff) masaniello.setActiveRules(instance.activeRules || []);

            if (instance.currentPlan && (hasPlanIdDiff || hasPlanContentDiff)) {
                masaniello.setPlans(prev => ({ ...prev, [instance.currentPlan!.id]: instance.currentPlan! }));
                masaniello.setActivePlanId(String(instance.currentPlan.id));
            }

            const timeout = setTimeout(() => {
                isExternalUpdating.current = false;
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [instance.config, instance.currentPlan, instance.activeRules, instance.history]);


    // 4. Process Actions Queue: Inter-plan communication
    useEffect(() => {
        if (!instance || !instance.actionsQueue || instance.actionsQueue.length === 0 || isProcessingAction.current) return;

        // CRITICAL: Wait for rehydration to complete before processing actions
        const instancePlanId = instance.currentPlan?.id ? String(instance.currentPlan.id) : null;
        if (masaniello.activePlanId !== instancePlanId) {
            return;
        }

        const action = instance.actionsQueue[0];

        if (action.type === 'RESOLVE_EVENT') {
            const { isWin, quota, surplus } = action.payload;
            isProcessingAction.current = true;

            // 1. Trigger math update
            masaniello.handleFullBet(isWin, quota, undefined, undefined, surplus || 0);

            // NOTE: We don't call onUpdate here anymore. 
            // The sync-back effect below will see the plan change and clear the queue atomically.
        }
    }, [instance.actionsQueue, masaniello.activePlanId, masaniello.handleFullBet]);

    // 5. Sync changes back to parent: Hook -> External
    useEffect(() => {
        if (!instance) return;

        const hasPlanChanged = JSON.stringify(masaniello.currentPlan) !== JSON.stringify(instance.currentPlan);
        const hasConfigChanged = JSON.stringify(masaniello.config) !== JSON.stringify(instance.config);
        const hasHistoryChanged = JSON.stringify(masaniello.history) !== JSON.stringify(instance.history);
        const hasRulesChanged = JSON.stringify(masaniello.activeRules) !== JSON.stringify(instance.activeRules);

        // CRITICAL: If an action was processed, we MUST sync back even if isExternalUpdating is true
        // and we MUST clear the queue atomically with the plan update.
        const hasQueueToClear = isProcessingAction.current && instance.actionsQueue && instance.actionsQueue.length > 0;

        if (hasPlanChanged || hasConfigChanged || hasHistoryChanged || hasRulesChanged || hasQueueToClear) {
            // If we are currently rehydrating FROM parent, block sync-back UNLESS we have an action result to send
            if (isExternalUpdating.current && !hasQueueToClear) return;

            onUpdate({
                config: masaniello.config,
                currentPlan: masaniello.currentPlan,
                history: masaniello.history,
                activeRules: masaniello.activeRules,
                ...(hasQueueToClear ? { actionsQueue: instance.actionsQueue!.slice(1) } : {})
            });

            if (hasQueueToClear) {
                // Clear the processing lock
                isProcessingAction.current = false;
            }
        }
    }, [
        masaniello.config,
        masaniello.currentPlan,
        masaniello.history,
        masaniello.activeRules,
        instance.actionsQueue,
        onUpdate
    ]);

    return masaniello;
};
