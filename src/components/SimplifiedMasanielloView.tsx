import React from 'react';
import { useMasanielloInstance } from '../hooks/useMasanielloInstance';
import ComprehensiveCapitalCard from './ComprehensiveCapitalCard';
import NextStakeCard from './NextStakeCard';
import BetActionsCard from './BetActionsCard';
import GatekeeperChecklist from './GatekeeperChecklist';
import ActiveRulesCard from './ActiveRulesCard';
import WeeklyTargetCard from './WeeklyTargetCard';
import HistoryLog from './HistoryLog';
import { AlertTriangle, LifeBuoy, Shield, ArrowLeft, Network, CheckCircle, Save } from 'lucide-react';
import { getRescueAdvisory } from '../utils/masaLogic';
import type { MasanielloInstance, MasaPlan } from '../types/masaniello';

interface SimplifiedMasanielloViewProps {
    instance: MasanielloInstance;
    onUpdate: (updates: Partial<MasanielloInstance>) => void;
    onSpawnSon?: (fatherQuota: number) => void;
    onSelectView?: (viewId: string) => void;
    onFeed?: (amount: number) => void;
    onBufferUpdate?: (newBuffer: number) => void;
    onFeedBack?: (amount: number) => void;
    onResolveMission?: (isWin: boolean) => void;
    onSaveLog?: (plan: MasaPlan) => void;
    activeInstances?: MasanielloInstance[];
}

const SimplifiedMasanielloView: React.FC<SimplifiedMasanielloViewProps> = ({
    instance,
    onUpdate,
    onSpawnSon,
    onSelectView,
    onFeed,
    onBufferUpdate,
    onFeedBack,
    onResolveMission,
    onSaveLog,
    activeInstances = []
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
        setActiveRules,
        activateRescueMode,
        lockProfit
    } = useMasanielloInstance(instance, onUpdate, onFeed, onBufferUpdate, onFeedBack);

    const [lockSuccess, setLockSuccess] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (lockSuccess) {
            const t = setTimeout(() => setLockSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [lockSuccess]);

    const handleLockProfit = (amount: number) => {
        lockProfit(amount);
        setLockSuccess(`€${amount} prelevati. Target e stake ricalcolati.`);
    };

    const [showManualRescue, setShowManualRescue] = React.useState(false);

    // MHI Alert Threshold State (Persisted)
    const [mhiThreshold, setMhiThreshold] = React.useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('masa_mhi_threshold');
            return saved ? parseInt(saved, 10) : 45;
        }
        return 45;
    });

    React.useEffect(() => {
        localStorage.setItem('masa_mhi_threshold', mhiThreshold.toString());
    }, [mhiThreshold]);

    const lockedToSons = React.useMemo(() => {
        return activeInstances.reduce((sum, inst) => {
            if (inst.id !== instance.id &&
                inst.currentPlan?.hierarchyType === 'SON' &&
                inst.currentPlan?.fatherPlanId === instance.id &&
                inst.status === 'active') {
                return sum + (inst.currentPlan?.fatherStake || 0);
            }
            return sum;
        }, 0);
    }, [activeInstances, instance.id]);

    const handleToggleRule = React.useCallback((ruleId: string) => {
        setActiveRules(prev => {
            if (prev.includes(ruleId)) {
                return prev.filter(id => id !== ruleId);
            } else {
                return [...prev, ruleId];
            }
        });
    }, [setActiveRules]);

    const [expandedHistory, setExpandedHistory] = React.useState<number | null>(null);
    const [showLastResult, setShowLastResult] = React.useState(false);
    const [lastClosedPlan, setLastClosedPlan] = React.useState<any>(null);

    React.useEffect(() => {
        if (history && history.length > 0) {
            const last = history[history.length - 1];
            if (!lastClosedPlan || last.id !== lastClosedPlan.id) {
                setLastClosedPlan(last);
                setShowLastResult(true);
            }
        }
    }, [history, lastClosedPlan]);

    const handleDismissLastResult = () => setShowLastResult(false);

    const [checklist, setChecklist] = React.useState<Record<string, boolean>>({});
    const [activePair, setActivePair] = React.useState('');

    const toggleChecklistItem = (id: string) => {
        setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const resetChecklist = () => {
        setChecklist({});
    };

    // Hedge Session State
    const [session, setSession] = React.useState<{ main: boolean | null, hedge: boolean | null } | null>(null);

    // Auto-resolve when both outcomes are set
    React.useEffect(() => {
        if (session && session.main !== null && session.hedge !== null) {
            const hOutcome = session.hedge;
            const mOutcome = session.main;
            const q = currentPlan!.quota;

            console.log('[SimpleMasa] Auto-resolving session:', { hOutcome, mOutcome });

            // CRITICAL: Clear session immediately to avoid infinite loop by effect re-triggering
            setSession(null);

            handleFullBet(hOutcome, q, 'HEDGE TRADE', {}, 0, true);
            setTimeout(() => {
                const skipSeq = hOutcome === true && mOutcome === false;
                handleFullBet(mOutcome, q, 'MAIN TRADE (HEDGED)', {}, 0, false, skipSeq);
            }, 50);
        }
    }, [session, currentPlan, handleFullBet]);

    const handleHedgeOutcome = (isWin: boolean) => {
        setSession(prev => prev ? { ...prev, hedge: isWin } : null);
    };

    if (!currentPlan) return <div>Caricamento piano...</div>;

    const nextStake = getNextStake();
    const currentQuota = currentPlan.quota;
    const potentialWin = nextStake * (currentQuota - 1);

    const isDisabled = currentPlan.status !== 'active';

    const advisory = getRescueAdvisory(currentPlan);
    const isAdvisoryVisible = advisory && advisory.score >= mhiThreshold && !currentPlan.isRescued;

    const requiredFatherProfit = (currentPlan.fatherStake || 0) * ((currentPlan.fatherQuota || 1) - 1);
    const totalCurrentWorth = currentPlan.currentCapital + (instance.history || []).reduce((sum, p) => sum + (p.accumulatedAmount || 0), 0);
    const totalProfit = totalCurrentWorth - instance.absoluteStartCapital;

    const isSonMissionAccomplished = currentPlan.hierarchyType === 'SON' &&
        (totalProfit >= requiredFatherProfit - 0.01 || currentPlan.status === 'success');
    const sonHasStarted = currentPlan.events.filter(e => !e.isSystemLog).length > 0;
    const isSonMissionFailed = currentPlan.hierarchyType === 'SON' &&
        (currentPlan.status === 'failed' || (sonHasStarted && currentPlan.remainingWins > currentPlan.remainingEvents));

    const netCurrentCapital = currentPlan.currentCapital + lockedToSons;
    const isTargetReached = netCurrentCapital > 0 && netCurrentCapital >= currentPlan.targetCapital - 0.01;

    // Elastic Horizon Triggers
    const elastic = instance.config.elasticConfig;
    const isElasticTriggered = !!(elastic && elastic.enabled &&
        (currentPlan.currentConsecutiveLosses || 0) >= elastic.triggerOnLosses &&
        (currentPlan.elasticStretchesUsed || 0) < elastic.maxStretches);

    const handleAction = (type: 'win' | 'loss' | 'pwin' | 'ploss' | 'be', note?: string) => {
        if (session) {
            if (type === 'win') setSession(prev => ({ ...prev!, main: true }));
            if (type === 'loss') setSession(prev => ({ ...prev!, main: false }));
            return;
        }

        switch (type) {
            case 'win': handleFullBet(true, currentQuota, activePair, checklist, 0, false, false, note); break;
            case 'loss': handleFullBet(false, currentQuota, activePair, checklist, 0, false, false, note); break;
            case 'pwin': handlePartialWin(currentQuota, activePair, checklist, note); break;
            case 'ploss': handlePartialLoss(currentQuota, activePair, checklist, note); break;
            case 'be': handleBreakEven(note); break;
        }
        resetChecklist();
    };

    const handleConvertToFather = () => {
        if (!currentPlan) return;
        onUpdate({
            config: {
                ...instance.config,
                hierarchyType: 'FATHER'
            },
            currentPlan: {
                ...currentPlan,
                hierarchyType: 'FATHER'
            } as MasaPlan
        });
    };

    return (
        <>
            {/* SON MISSION SUCCESS BANNER */}
            {isSonMissionAccomplished && (
                <div className="animate-fade-in" style={{ gridColumn: '1 / -1' }}>
                    <div className="bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border border-emerald-500/30 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="font-['DM_Mono'] font-black text-lg text-emerald-400 uppercase tracking-wider">Missione Compiuta!</h3>
                                <p className="text-emerald-100/70 text-sm">L'obiettivo del Masa Padre è stato raggiunto. Il surplus verrà accreditato al Padre.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => onResolveMission?.(true)}
                                className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-['DM_Mono'] px-8 py-3 rounded-xl transition-all shadow-lg text-sm font-black uppercase tracking-tight"
                            >
                                TORNA AL MASA PADRE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SON MISSION FAILURE BANNER */}
            {isSonMissionFailed && (
                <div className="animate-fade-in" style={{ gridColumn: '1 / -1' }}>
                    <div className="bg-gradient-to-r from-rose-900/90 to-red-900/90 border border-rose-500/30 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="font-['DM_Mono'] font-black text-lg text-rose-400 uppercase tracking-wider">Missione Fallita</h3>
                                <p className="text-rose-100/70 text-sm">Il Masa Figlio non può più raggiungere l'obiettivo del Padre. Deve essere chiuso.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => onResolveMission?.(false)}
                                className="bg-rose-400 hover:bg-rose-300 text-rose-950 font-['DM_Mono'] px-8 py-3 rounded-xl transition-all shadow-lg text-sm font-black uppercase tracking-tight"
                            >
                                TORNA AL MASA PADRE
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* SON MISSION BANNER */}
            {currentPlan.hierarchyType === 'SON' && (
                <div style={{ gridColumn: '1 / -1', marginBottom: '20px' }}>
                    <div className="card-redesign" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div className="card-body-redesign" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <button
                                    onClick={() => currentPlan.fatherPlanId && onSelectView?.(currentPlan.fatherPlanId)}
                                    className="hover:bg-blue-500/10 transition-colors"
                                    style={{
                                        fontSize: '9px',
                                        padding: '6px 12px',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(59,130,246,0.3)',
                                        borderRadius: '10px',
                                        fontWeight: 900,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    <ArrowLeft size={12} /> Torna al Padre
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ height: '32px', width: '32px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa', fontWeight: 800, margin: 0 }}>MISSIONE FIGLIO</h4>
                                        <p style={{ fontSize: '12px', color: 'var(--txt-secondary)', margin: '2px 0 0 0' }}>
                                            Obiettivo: Raggiungere un utile di <strong>€{
                                                currentPlan.fatherStake && currentPlan.fatherQuota
                                                    ? Math.ceil(currentPlan.fatherStake * (currentPlan.fatherQuota - 1)).toLocaleString('it-IT')
                                                    : Math.ceil((currentPlan.targetCapital || 0) - currentPlan.startCapital).toLocaleString('it-IT')
                                            }</strong> per l'evento del Padre.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--txt-muted)', fontWeight: 700 }}>Progresso Missione</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(100, Math.max(0, (totalProfit / (
                                                requiredFatherProfit || Math.max(1, (currentPlan.targetCapital || 1) - currentPlan.startCapital)
                                            )) * 100))}%`,
                                            background: 'var(--accent-blue)',
                                            transition: 'width 1s ease-out'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--txt-primary)' }}>
                                        {Math.floor(Math.max(0, (totalProfit / (
                                            requiredFatherProfit || Math.max(1, (currentPlan.targetCapital || 1) - currentPlan.startCapital)
                                        )) * 100))}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SAVE LOG ACTION BAR */}
            {onSaveLog && (
                <div style={{ gridColumn: '1 / -1' }} className="flex justify-end">
                    <button
                        onClick={() => {
                            onSaveLog(currentPlan);
                            alert('Sessione salvata correttamente nel Diario!');
                        }}
                        className="group flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded-xl border border-indigo-500/20 transition-all active:scale-95"
                    >
                        <Save size={14} className="group-hover:scale-110 transition-transform" />
                        Salva Diario
                    </button>
                </div>
            )}

            {/* TARGET REACHED SUCCESS BANNER (FATHER / STANDALONE) */}
            {isTargetReached && currentPlan.hierarchyType !== 'SON' && (
                <div className="animate-fade-in" style={{ gridColumn: '1 / -1', marginBottom: '20px' }}>
                    <div className="bg-gradient-to-r from-emerald-900 to-green-900 text-white p-6 rounded-xl shadow-2xl border-l-4 border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 rounded-full ring-2 ring-emerald-500/50">
                                <CheckCircle size={32} className="text-emerald-300" />
                            </div>
                            <div>
                                <div className="font-['DM_Mono'] font-black text-lg uppercase tracking-wider text-emerald-100 mb-1">Target Raggiunto! 🏆</div>
                                <div className="text-sm text-emerald-200/80 font-medium">
                                    {currentPlan.hierarchyType === 'FATHER'
                                        ? "Hai raggiunto l'obiettivo monetario del piano, grazie al prezioso contributo dei Masa Figli!"
                                        : "Hai raggiunto l'obiettivo monetario del piano!"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* STANDALONE TO FATHER UPGRADE */}
            {currentPlan.hierarchyType === 'STANDALONE' && (
                <div style={{ gridColumn: '1 / -1', marginBottom: '12px', textAlign: 'left' }}>
                    <button
                        onClick={handleConvertToFather}
                        className="btn btn-ghost flex items-center gap-2 transition-all hover:bg-slate-800"
                        style={{ fontSize: '11px', opacity: 0.9, padding: '8px 12px' }}
                    >
                        <Network size={14} className="text-blue-400" /> Converti in Masa Padre
                    </button>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                opacity: (isSonMissionAccomplished || isSonMissionFailed || currentPlan.status !== 'active') ? 0.5 : 1,
                pointerEvents: (isSonMissionAccomplished || isSonMissionFailed || currentPlan.status !== 'active') ? 'none' : 'auto',
                filter: (isSonMissionAccomplished || isSonMissionFailed || currentPlan.status !== 'active') ? 'grayscale(0.3) brightness(0.9)' : 'none',
                transition: 'all 0.5s ease-in-out'
            }}>
                <ComprehensiveCapitalCard
                    plan={currentPlan}
                    history={history}
                    lockedToSons={lockedToSons}
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
                    onToggleAll={(activateAll) => {
                        if (activateAll) {
                            setActiveRules(['smart_auto_close', 'first_win', 'back_positive', 'impossible']);
                        } else {
                            setActiveRules([]);
                        }
                    }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* UNIFIED PRIORITY BANNER */}
                {lockSuccess && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                        <CheckCircle size={16} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-200">{lockSuccess}</span>
                    </div>
                )}

                {(isAdvisoryVisible || isElasticTriggered) && (
                    <div className={`
                        p-4 rounded-xl shadow-lg border-l-4 flex flex-col gap-2 animate-in slide-in-from-top-2
                        ${isAdvisoryVisible
                            ? (advisory.urgency === 'critical' ? 'bg-gradient-to-r from-red-900/90 to-rose-900/90 border-red-500 text-white' : 'bg-gradient-to-r from-amber-900/90 to-orange-900/90 border-amber-500 text-white')
                            : 'bg-gradient-to-r from-indigo-900/90 to-slate-900/90 border-indigo-500 text-white'}
                    `}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                {isAdvisoryVisible ? (
                                    <AlertTriangle size={20} className={advisory.urgency === 'critical' ? 'text-red-300' : 'text-amber-300'} />
                                ) : (
                                    <Shield size={20} className="text-indigo-300" />
                                )}
                                <div className="flex-1">
                                    <div className="font-black text-xs uppercase tracking-wider opacity-90">
                                        {isAdvisoryVisible ? (advisory.urgency === 'critical' ? 'INTERVENTO CRITICO' : 'ATTENZIONE RISCHIO') : 'Elastic Horizon: Ammortizzatore'}
                                    </div>
                                    <div className="text-[10px] opacity-80 max-w-xs leading-tight mt-0.5 font-bold">
                                        {isAdvisoryVisible ? `MHI Score: ${advisory.score}. ${advisory.reason}` : `Rilevato Drawdown. Estendi l'orizzonte (Stretch ${(currentPlan.elasticStretchesUsed || 0) + 1}/${elastic?.maxStretches || 0}).`}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowManualRescue(true)}
                                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors shadow-lg"
                            >
                                <LifeBuoy size={16} className={showManualRescue ? 'animate-spin-slow' : ''} />
                            </button>
                        </div>
                    </div>
                )}

                <NextStakeCard
                    stake={nextStake}
                    quota={currentQuota}
                    potentialWin={potentialWin}
                    onQuotaChange={(q) => onUpdate({ currentPlan: { ...currentPlan, quota: q } })}
                    isDisabled={isDisabled}
                    lastClosedPlan={showLastResult ? lastClosedPlan : null}
                    onDismissLastResult={handleDismissLastResult}
                    onToggleRescue={() => setShowManualRescue(!showManualRescue)}
                    onApplyRescue={(events, wins, target, maxLoss) => {
                        activateRescueMode(events, target, wins, 0, maxLoss);
                        setShowManualRescue(false);
                    }}
                    isRescueActive={showManualRescue}
                    isRescued={currentPlan?.isRescued}
                    plan={currentPlan}
                    mhiThreshold={mhiThreshold}
                    onMhiThresholdChange={setMhiThreshold}
                    warningMessage={
                        nextStake <= 0
                            ? "Impossibile calcolare la prossima puntata. Controlla lo stato del piano."
                            : undefined
                    }
                />

                <BetActionsCard
                    onWin={(note) => handleAction('win', note)}
                    onLoss={(note) => handleAction('loss', note)}
                    onPartialWin={(note) => handleAction('pwin', note)}
                    onPartialLoss={(note) => handleAction('ploss', note)}
                    onBreakEven={(note) => handleAction('be', note)}
                    onHedge={() => setSession({ main: null, hedge: null })}
                    onHedgeOutcome={handleHedgeOutcome}
                    onCancelHedge={() => setSession(null)}
                    isHedgeActive={!!session}
                    session={session}
                    nextStake={nextStake}
                    hedgeMultiplier={instance.config.hedgeMultiplier || 0.2}
                    hedgeQuota={instance.config.hedgeQuota || 3}
                    onSpawnSon={currentPlan.hierarchyType === 'FATHER' ? () => onSpawnSon?.(currentPlan.quota) : undefined}
                    sonsCompleted={instance.sonsCompleted}
                    sonsFailed={instance.sonsFailed}
                    isDisabled={currentPlan.status !== 'active'}
                    onLockProfit={handleLockProfit}
                />

                {instance.config.role !== 'slave' && (
                    <div className="md:col-span-1">
                        <WeeklyTargetCard
                            plan={currentPlan}
                            config={instance.config}
                            history={history}
                            totalTargetsReached={instance.globalWeeklyTargetsReached || 0}
                        />
                    </div>
                )}
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
