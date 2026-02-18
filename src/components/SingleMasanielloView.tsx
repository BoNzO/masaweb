import React from 'react';
import { useMasanielloInstance } from '../hooks/useMasanielloInstance';
import ActivePlan from './ActivePlan';
import AnalyticsSection from './AnalyticsSection';
import HistoryLog from './HistoryLog';
import StatsOverview from './StatsOverview';
import ConfigurationPanel from './ConfigurationPanel';
import DebugRules from './DebugRules';
import { Settings, CheckCircle, RotateCcw, Archive as ArchiveIcon, RefreshCw, Edit2, PartyPopper, X, AlertOctagon, Trash2, Crown, Link as LinkIcon } from 'lucide-react';
import type { MasanielloInstance } from '../types/masaniello';
import type { ChartDataPoint } from '../types/masaniello';

interface SingleMasanielloViewProps {
    instance: MasanielloInstance;
    onUpdate: (updates: Partial<MasanielloInstance>) => void;
    onArchive: () => void;
    onClone: () => void;
    onDelete: (id: string) => void;
    archivedInstances: MasanielloInstance[];
    activeInstances: MasanielloInstance[];
    onSelectInstance: (id: string) => void;
    onFeed?: (amount: number) => void;
    onBufferUpdate?: (newBuffer: number) => void;
}

const SingleMasanielloView: React.FC<SingleMasanielloViewProps> = ({
    instance,
    onUpdate,
    onArchive,
    onClone,
    onDelete,
    archivedInstances,
    activeInstances,
    onSelectInstance,
    onFeed,
    onBufferUpdate
}) => {
    // Role status
    const role = instance.currentPlan?.role || instance.config.role || 'standard';
    const isMaster = role === 'master';
    const isSlave = role === 'slave';

    // Use the wrapper hook that syncs with multi-Masaniello system
    const {
        config,
        setConfig,
        currentPlan,
        setCurrentPlan,
        history,
        activeRules,
        toggleRule,
        toggleAllRules,
        startNewPlan,
        handleFullBet,
        handlePartialWin,
        handlePartialLoss,
        handleBreakEven,
        handleAdjustment,
        resetAll,
        transitionToNextPlan,
        getNextStake,
        getRescueSuggestion,
        activateRescueMode,
        updatePlanStartCapital,
        updateAbsoluteStartCapital,
        setHistory // Destructure setHistory
    } = useMasanielloInstance(instance, onUpdate, onFeed, onBufferUpdate);

    const [showConfig, setShowConfig] = React.useState(!instance.currentPlan);
    const [expandedHistory, setExpandedHistory] = React.useState<number | null>(null);
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [tempName, setTempName] = React.useState(instance.name);

    // Sync tempName when instance changes (e.g. switching tabs)
    React.useEffect(() => {
        setTempName(instance.name);
    }, [instance.id, instance.name]);

    const handleSaveName = () => {
        onUpdate({ name: tempName });
        setIsEditingName(false);
    };

    // Success & Failure Notification Logic
    const [showSuccess, setShowSuccess] = React.useState(false);
    const [showFailure, setShowFailure] = React.useState(false);
    const [lastCycleProfit, setLastCycleProfit] = React.useState(0);
    const [failureReason, setFailureReason] = React.useState('');
    React.useEffect(() => {
        if (history.length > 0) {
            const lastPlan = history[history.length - 1];

            // FAILURE DETECTION
            if (lastPlan.status === 'failed' && !lastPlan.notificationDismissed) {
                let reason = 'Il piano è fallito.';
                if (lastPlan.triggeredRule === 'max_losses') {
                    reason = `Limite di ${lastPlan.maxConsecutiveLosses} perdite consecutive superato!`;
                } else if (lastPlan.triggeredRule === 'impossible') {
                    reason = `Obiettivo impossibile: mancano troppe vittorie (${lastPlan.remainingWins}) rispetto agli eventi residui (${lastPlan.remainingEvents}).`;
                }
                setFailureReason(reason);
                setShowFailure(true);
                setShowSuccess(false);
                return;
            }

            // SUCCESS DETECTION
            const successStatuses = [
                'completed',
                'target_reached',
                'rescue_target_reached',
                'first_win_close',
                'back_positive_close',
                'profit_90_reset',
                'auto_bank_100',
                'profit_milestone',
                'smart_auto_close',
                'manual_close'
            ];

            const profit = lastPlan.currentCapital - lastPlan.startCapital;

            if (successStatuses.includes(lastPlan.status) && profit > 0 && !lastPlan.notificationDismissed) {
                setLastCycleProfit(profit);
                setShowSuccess(true);
                setShowFailure(false);
                return;
            }
        }
    }, [history, instance.id]);

    const handleDismissSuccess = () => {
        setShowSuccess(false);
        // Persist dismissal using local setter to avoid sync conflicts
        if (history.length > 0) {
            const lastPlanIndex = history.length - 1;
            const updatedHistory = [...history];
            updatedHistory[lastPlanIndex] = {
                ...updatedHistory[lastPlanIndex],
                notificationDismissed: true
            };
            setHistory(updatedHistory); // Use setHistory
        }
    };

    const handleDismissFailure = () => {
        setShowFailure(false);
        // Persist dismissal for failure too
        if (history.length > 0) {
            const lastPlanIndex = history.length - 1;
            const updatedHistory = [...history];
            updatedHistory[lastPlanIndex] = {
                ...updatedHistory[lastPlanIndex],
                notificationDismissed: true
            };
            setHistory(updatedHistory); // Use setHistory
        }
    };

    const RULES = React.useMemo(() => [
        { id: 'first_win', label: 'Vittoria iniziale → Chiusura ciclo' },
        { id: 'back_positive', label: 'Ritorno in positivo → Chiusura ciclo' },
        { id: 'auto_bank_100', label: 'Accantona al 100% target settimanale' },
        { id: 'smart_auto_close', label: 'Chiusura protettiva (>65% eventi, >90% capitale)' },
        { id: 'profit_milestone', label: `Profit Milestone: ${config.milestoneBankPercentage}%` },
    ], [config]);

    // Helper for rule status
    const getRuleStatus = React.useCallback((ruleId: string) => {
        return {
            active: activeRules.includes(ruleId),
            enabled: activeRules.includes(ruleId),
            isSuspended: false
        };
    }, [activeRules]);

    const rulesForActivePlan = React.useMemo(() => RULES.map(r => ({ ...r, id: r.id as any })), [RULES]);

    // Calculate stats
    const stats = React.useMemo(() => {
        const allPlans = [...history];
        if (currentPlan) allPlans.push(currentPlan);

        const totalBanked = history.reduce((sum, plan) => sum + (plan.accumulatedAmount || 0), 0);
        const currentCapital = currentPlan?.currentCapital || instance.absoluteStartCapital;
        const totalWorth = currentCapital + totalBanked;
        const totalProfit = totalWorth - instance.absoluteStartCapital;
        const totalGrowth = (totalProfit / instance.absoluteStartCapital) * 100;

        const totalWins = allPlans.reduce((sum, p) => sum + p.wins, 0);
        const totalLosses = allPlans.reduce((sum, p) => sum + p.losses, 0);

        return {
            totalWorth,
            totalBanked,
            totalProfit,
            totalGrowth,
            totalWins,
            totalLosses,
            absoluteStartCapital: instance.absoluteStartCapital
        };
    }, [history, currentPlan, instance.absoluteStartCapital]);

    // Chart data
    const chartData: ChartDataPoint[] = React.useMemo(() => {
        const data: ChartDataPoint[] = [];
        const allPlans = [...history];
        if (currentPlan) allPlans.push(currentPlan);

        let eventCounter = 0;

        allPlans.forEach((plan) => {
            // Point for the start of the plan (especially for the first plan or jumps)
            if (data.length === 0) {
                data.push({
                    name: `Inizio`,
                    capital: plan.startCapital,
                    days: 0,
                    cycle: plan.generationNumber
                });
            }

            const activeEvents = plan.events.filter(e => !e.isSystemLog);
            activeEvents.forEach((ev) => {
                eventCounter++;
                data.push({
                    name: `E${eventCounter}`,
                    capital: ev.capitalAfter,
                    days: Number((eventCounter / 2.5).toFixed(1)), // Based on 2.5 trades/day
                    cycle: plan.generationNumber
                });
            });
        });

        return data;
    }, [history, currentPlan]);

    // Weekly target calculations
    const absoluteWeeklyTarget = currentPlan?.currentWeeklyTarget ||
        ((currentPlan?.startCapital || config.initialCapital) * (1 + config.weeklyTargetPercentage / 100));
    const weeklyTarget = absoluteWeeklyTarget;
    const displayWeeklyPercentage = config.weeklyTargetPercentage;

    // Heatmap data (simplified)
    const heatmapData = React.useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            key: `week_${i + 1}`,
            percentage: i < 3 ? 100 : 0,
            data: []
        }));
    }, []);

    if (instance.status === 'archived') {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                    <ArchiveIcon size={48} className="mx-auto mb-4 text-slate-500" />
                    <h3 className="text-xl font-bold text-slate-300 mb-2">Masaniello Archiviato</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Questo Masaniello è stato archiviato il {new Date(instance.archivedAt!).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                        Puoi consultare lo storico qui sotto, ma non puoi più effettuare operazioni.
                    </p>
                </div>

                {/* Show history only */}
                <HistoryLog
                    history={history}
                    expandedHistory={expandedHistory}
                    setExpandedHistory={setExpandedHistory}
                />
            </div>
        );
    }

    const handleReset = () => {
        if (window.confirm('Sei sicuro di voler resettare questo Masaniello? Tutti i dati storici e il piano attuale verranno persi.')) {
            resetAll();
            setShowConfig(true);
        }
    };
    return (
        <div className="space-y-6">
            {/* Header with Name Editing */}
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                {isEditingName ? (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            autoFocus
                            className="bg-slate-900 border border-blue-500 rounded px-3 py-1 text-xl font-bold text-white w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                            onClick={handleSaveName}
                            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                        >
                            SALVA
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                            {instance.name}
                        </h2>
                        {isMaster && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <Crown size={12} /> Master
                            </div>
                        )}
                        {isSlave && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <LinkIcon size={12} /> Slave
                            </div>
                        )}
                        <div className="p-1.5 bg-slate-700/50 rounded-lg text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-all opacity-0 group-hover:opacity-100">
                            <Edit2 size={16} />
                        </div>
                    </div>
                )}
            </div>

            {/* Success Celebration Banner */}
            {showSuccess && (
                <div className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-600 p-1 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-in zoom-in-95 slide-in-from-top-4 duration-500">
                    <div className="bg-slate-900/40 backdrop-blur-md rounded-[14px] p-6 flex items-center justify-between gap-6 relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                            <PartyPopper size={120} className="absolute -top-10 -left-10 rotate-12 text-white" />
                            <PartyPopper size={80} className="absolute -bottom-5 -right-5 -rotate-12 text-white" />
                        </div>

                        <div className="flex items-center gap-5 relative z-10">
                            <div className="bg-emerald-500 p-4 rounded-2xl shadow-lg ring-4 ring-emerald-500/20 animate-bounce">
                                <CheckCircle size={32} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                    CICLO COMPLETATO! <PartyPopper className="text-yellow-400" size={24} />
                                </h3>
                                <p className="text-emerald-100 font-medium opacity-90">
                                    Complimenti! Hai chiuso la generazione con un profitto di <span className="font-black text-white text-lg">€{lastCycleProfit.toFixed(2)}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="hidden md:block text-right">
                                <div className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">Status</div>
                                <div className="text-xs font-bold text-white bg-emerald-500/30 px-3 py-1 rounded-full border border-emerald-500/50">
                                    OBIETTIVO RAGGIUNTO
                                </div>
                            </div>
                            <button
                                onClick={handleDismissSuccess}
                                className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Failure Notification Banner */}
            {showFailure && (
                <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-800 p-1 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-in zoom-in-95 slide-in-from-top-4 duration-500">
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-[14px] p-6 flex items-center justify-between gap-6 relative overflow-hidden">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="bg-red-600 p-4 rounded-2xl shadow-lg ring-4 ring-red-600/20">
                                <AlertOctagon size={32} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                                    Ciclo Fallito
                                </h3>
                                <p className="text-red-100 font-medium opacity-90">
                                    {failureReason}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="hidden md:block text-right">
                                <div className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-1">Status</div>
                                <div className="text-xs font-bold text-white bg-red-600/30 px-3 py-1 rounded-full border border-red-500/50">
                                    PERDITA TOTALE
                                </div>
                            </div>
                            <button
                                onClick={handleDismissFailure}
                                className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <Settings size={16} />
                    {showConfig ? 'NASCONDI CONFIG' : 'MOSTRA CONFIG'}
                </button>

                {currentPlan && (
                    <button
                        onClick={() => {
                            if (confirm('Vuoi chiudere questo ciclo e iniziarne uno nuovo?')) {
                                transitionToNextPlan(currentPlan, 'manual_close', null);
                            }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <CheckCircle size={16} />
                        CHIUDI CICLO
                    </button>
                )}

                <button
                    onClick={onClone}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <RotateCcw size={16} />
                    CLONA
                </button>

                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg text-red-100 text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <RefreshCw size={16} />
                    RESET
                </button>

                <button
                    onClick={() => {
                        if (confirm('Vuoi archiviare questo Masaniello? Il capitale verrà rilasciato nel pool.')) {
                            onArchive();
                        }
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <ArchiveIcon size={16} />
                    ARCHIVIA
                </button>

                <button
                    onClick={() => {
                        if (confirm('Sei sicuro di voler eliminare DEFINITIVAMENTE questo Masaniello? Questa azione non può essere annullata.')) {
                            onDelete(instance.id);
                        }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <Trash2 size={16} />
                    ELIMINA
                </button>
            </div>

            {/* Configuration Panel */}
            {
                showConfig && (
                    <ConfigurationPanel
                        config={config}
                        setConfig={setConfig}
                        onStart={() => {
                            startNewPlan();
                            setShowConfig(false);
                        }}
                        activeRules={activeRules}
                        toggleRule={toggleRule}
                        toggleAllRules={toggleAllRules}
                        activeInstances={activeInstances}
                    />
                )
            }

            {/* Main Grid */}
            {/* Main Grid - Hidden when Config is open */}
            {!showConfig && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <StatsOverview
                            totalWorth={stats.totalWorth}
                            startCapital={config.initialCapital}
                            absoluteStartCapital={stats.absoluteStartCapital}
                            totalProfit={stats.totalProfit}
                            totalGrowth={stats.totalGrowth}
                            totalBanked={stats.totalBanked}
                            totalWins={stats.totalWins}
                            totalLosses={stats.totalLosses}

                            estimatedDays={Math.ceil((stats.totalWins + stats.totalLosses) / 2.5)}
                            expectedWinsTotal={0}
                            evPerformance={1}
                            onUpdateAbsoluteStartCapital={updateAbsoluteStartCapital}
                        />

                        <AnalyticsSection
                            chartData={chartData}
                            heatmapData={heatmapData}
                            weeklyTarget={weeklyTarget}
                            weeklyTargetPercentage={displayWeeklyPercentage}
                            currentCapital={currentPlan?.currentCapital || config.initialCapital}
                            startCapital={currentPlan?.startWeeklyBaseline || currentPlan?.startCapital || config.initialCapital}
                            absoluteWeeklyTarget={absoluteWeeklyTarget}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {currentPlan && (
                            <ActivePlan
                                currentPlan={currentPlan}
                                activeRules={activeRules}
                                rules={rulesForActivePlan}
                                toggleRule={toggleRule}
                                toggleAllRules={toggleAllRules}
                                getRuleStatus={getRuleStatus}
                                onFullBet={handleFullBet}
                                onPartialWin={handlePartialWin}
                                onPartialLoss={handlePartialLoss}
                                onBreakEven={handleBreakEven}
                                onAdjustment={handleAdjustment}
                                onActivateRescue={activateRescueMode}
                                onEarlyClose={() => transitionToNextPlan(currentPlan, 'manual_close', null)}
                                getNextStake={getNextStake}
                                getRescueSuggestion={getRescueSuggestion}
                                onUpdateStartCapital={updatePlanStartCapital}
                                onUpdatePlan={setCurrentPlan}
                                config={config}
                                activeInstances={activeInstances}
                                onSelectInstance={onSelectInstance}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* History */}
            <HistoryLog
                history={history}
                expandedHistory={expandedHistory}
                setExpandedHistory={setExpandedHistory}
            />

            {/* Debug Panel */}
            {
                currentPlan && (
                    <DebugRules plan={currentPlan} activeRules={activeRules} config={config} />
                )
            }

            {/* Archived Instances List (Moved from Tabs) */}
            {archivedInstances.length > 0 && (
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 mt-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ArchiveIcon size={16} />
                        Masanielli Archiviati ({archivedInstances.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {archivedInstances.map(archived => (
                            <div
                                key={archived.id}
                                onClick={() => onSelectInstance(archived.id)}
                                className="bg-slate-800 hover:bg-slate-700/80 p-4 rounded-lg border border-slate-700 transition-all text-left group relative cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-slate-300 group-hover:text-white transition-colors">
                                        {archived.name}
                                    </div>
                                    <div className="text-[10px] bg-slate-700/50 px-2 py-1 rounded text-slate-500">
                                        {new Date(archived.archivedAt!).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Capitale Finale: <span className={(archived.currentPlan?.currentCapital || 0) >= archived.absoluteStartCapital ? 'text-green-400' : 'text-red-400'}>
                                        €{(archived.currentPlan?.currentCapital || archived.absoluteStartCapital).toFixed(2)}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Sei sicuro di voler eliminare DEFINITIVAMENTE questo Masaniello archiviato?')) {
                                            onDelete(archived.id);
                                        }
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-red-600 rounded text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                    title="Elimina definitivamente"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div >
    );
};

export default SingleMasanielloView;
