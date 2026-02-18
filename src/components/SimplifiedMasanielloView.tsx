import React from 'react';
import { useMasanielloInstance } from '../hooks/useMasanielloInstance';
import ComprehensiveCapitalCard from './ComprehensiveCapitalCard';
import NextStakeCard from './NextStakeCard';
import BetActionsCard from './BetActionsCard';
import GatekeeperChecklist from './GatekeeperChecklist';
import ActiveRulesCard, { AVAILABLE_RULES } from './ActiveRulesCard';
import WeeklyTargetCard from './WeeklyTargetCard';
import HistoryLog from './HistoryLog';
import type { MasanielloInstance } from '../types/masaniello';

interface SimplifiedMasanielloViewProps {
    instance: MasanielloInstance;
    onUpdate: (updates: Partial<MasanielloInstance>) => void;
    onFeed?: (amount: number) => void;
    onBufferUpdate?: (newBuffer: number) => void;
}

const SimplifiedMasanielloView: React.FC<SimplifiedMasanielloViewProps> = ({
    instance,
    onUpdate,
    onFeed,
    onBufferUpdate
}) => {
    const {
        currentPlan,
        history,
        handleFullBet,
        handlePartialWin,
        handlePartialLoss,
        handleBreakEven,
        getNextStake,
        activeRules,
        setActiveRules
    } = useMasanielloInstance(instance, onUpdate, onFeed, onBufferUpdate);

    const handleToggleRule = React.useCallback((ruleId: string) => {
        setActiveRules(prev => {
            if (prev.includes(ruleId)) {
                return prev.filter(id => id !== ruleId);
            } else {
                return [...prev, ruleId];
            }
        });
    }, [setActiveRules]);

    const handleToggleAllRules = React.useCallback((activate: boolean) => {
        if (activate) {
            setActiveRules(AVAILABLE_RULES.map((r: any) => r.id));
        } else {
            setActiveRules([]);
        }
    }, [setActiveRules]);

    const [currentQuota, setCurrentQuota] = React.useState(currentPlan?.quota || 2.0);
    const [activePair, setActivePair] = React.useState(currentPlan?.lastUsedPair || '');

    // Sync quota with plan config when it changes
    React.useEffect(() => {
        if (currentPlan?.quota) {
            setCurrentQuota(currentPlan.quota);
        }
    }, [currentPlan?.quota]);

    // Checklist State
    const [checklist, setChecklist] = React.useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        (instance.config.checklistTemplate || []).forEach(item => {
            initial[item] = false;
        });
        return initial;
    });

    const toggleChecklistItem = (item: string) => {
        setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const resetChecklist = () => {
        const reset: Record<string, boolean> = {};
        (instance.config.checklistTemplate || []).forEach(item => {
            reset[item] = false;
        });
        setChecklist(reset);
    };

    // Get next stake
    const nextStake = getNextStake(currentQuota);
    const potentialWin = nextStake * currentQuota;

    // Check if actions are disabled
    const isDisabled = !currentPlan || currentPlan.status !== 'active' || nextStake <= 0;

    const [dismissedPlanIds, setDismissedPlanIds] = React.useState<number[]>([]);

    const lastClosedPlan = history.length > 0 ? history[history.length - 1] : null;
    const showLastResult = lastClosedPlan &&
        !lastClosedPlan.notificationDismissed &&
        !dismissedPlanIds.includes(lastClosedPlan.id);

    const handleDismissLastResult = React.useCallback(() => {
        if (!lastClosedPlan) return;

        // Local dismissal for immediate UI feedback
        setDismissedPlanIds(prev => [...prev, lastClosedPlan.id]);

        // Parent dismissal for persistence
        const newHistory = history.map(p =>
            p.id === lastClosedPlan.id ? { ...p, notificationDismissed: true } : p
        );
        onUpdate({ history: newHistory });
    }, [history, lastClosedPlan, onUpdate]);

    const [expandedHistory, setExpandedHistory] = React.useState<number | null>(null);

    if (!currentPlan) {
        return (
            <div className="card-redesign" style={{ gridColumn: '1 / -1' }}>
                <div className="card-body-redesign" style={{ textAlign: 'center', padding: '48px 32px' }}>
                    <h3 className="font-display text-xl" style={{ color: 'var(--txt-secondary)', marginBottom: '12px' }}>
                        Nessun Piano Attivo
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>
                        Configura un nuovo piano per iniziare.
                    </p>
                </div>
            </div>
        );
    }

    const handleAction = (type: 'win' | 'loss' | 'pwin' | 'ploss' | 'be') => {
        // Dismiss the last result banner if visible
        if (showLastResult) handleDismissLastResult();

        const results = { ...checklist };
        const pair = activePair;

        switch (type) {
            case 'win': handleFullBet(true, currentQuota, pair, results); break;
            case 'loss': handleFullBet(false, currentQuota, pair, results); break;
            case 'pwin': handlePartialWin(currentQuota, pair, results); break;
            case 'ploss': handlePartialLoss(currentQuota, pair, results); break;
            case 'be': handleBreakEven(); break;
        }

        resetChecklist();
    };

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <ComprehensiveCapitalCard
                    plan={currentPlan}
                    history={history}
                />

                <GatekeeperChecklist
                    template={instance.config.checklistTemplate || []}
                    checklist={checklist}
                    onToggle={toggleChecklistItem}
                    activePair={activePair}
                    onPairChange={setActivePair}
                />

                <ActiveRulesCard
                    activeRules={activeRules}
                    onToggleRule={handleToggleRule}
                    onToggleAll={handleToggleAllRules}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <NextStakeCard
                    stake={nextStake}
                    quota={currentQuota}
                    potentialWin={potentialWin}
                    onQuotaChange={setCurrentQuota}
                    isDisabled={isDisabled}
                    lastClosedPlan={showLastResult ? lastClosedPlan : null}
                    onDismissLastResult={handleDismissLastResult}
                    warningMessage={
                        nextStake <= 0
                            ? "Impossibile calcolare la prossima puntata. Controlla lo stato del piano."
                            : undefined
                    }
                />
                <BetActionsCard
                    onWin={() => handleAction('win')}
                    onLoss={() => handleAction('loss')}
                    onPartialWin={() => handleAction('pwin')}
                    onPartialLoss={() => handleAction('ploss')}
                    onBreakEven={() => handleAction('be')}
                    isDisabled={isDisabled}
                />
                <WeeklyTargetCard
                    plan={currentPlan}
                    config={instance.config}
                    history={history}
                />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
                <HistoryLog
                    history={history}
                    expandedHistory={expandedHistory}
                    setExpandedHistory={setExpandedHistory}
                />
            </div>
        </>
    );
};

export default SimplifiedMasanielloView;
