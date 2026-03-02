import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    LifeBuoy,
    XCircle,
    RefreshCw,
    CheckCircle,
    ChevronDown,
    CheckSquare,
    History as HistoryIcon,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    Shield,
    Plus,
    Minus,
    Download,
    Globe,
    ClipboardCheck,
    AlertOctagon,
    Crown,
    Link as LinkIcon
} from 'lucide-react';
import { generateCSV, downloadCSV } from '../utils/exportUtils';
import type { MasaPlan, Rule, MasanielloInstance } from '../types/masaniello';
import { getEarlyClosureSuggestion, calculateTiltThreshold, getRescueAdvisory } from '../utils/masaLogic';
import { calculateMaxNetProfit } from '../utils/mathUtils';
import DebugRules from './DebugRules';

interface ActivePlanProps {
    currentPlan: MasaPlan;
    activeRules: string[];
    rules: Rule[];
    toggleRule: (id: string) => void;
    toggleAllRules: (ids: string[]) => void;
    getRuleStatus: (id: string) => { active: boolean; enabled: boolean; isSuspended?: boolean };
    onFullBet: (isWin: boolean, customQuota?: number, pair?: string, checklistResults?: Record<string, boolean>) => void;
    onPartialWin: (customQuota: number, pair?: string, checklistResults?: Record<string, boolean>) => void;
    onPartialLoss: (customQuota: number, pair?: string, checklistResults?: Record<string, boolean>) => void;
    onBreakEven: () => void;
    onAdjustment: (amount: number, isWinEquivalent: boolean) => void;
    onActivateRescue: (events: number, target?: number, wins?: number, extraCap?: number, maxLosses?: number) => void;
    onEarlyClose: () => void;
    getNextStake: (quota?: number) => number;
    onUpdatePlan: (newPlan: MasaPlan) => void;
    onUpdateStartCapital: (newAmount: number) => void;
    config: { checklistTemplate?: string[]; elasticConfig?: any };
    activeInstances?: MasanielloInstance[];
    onSelectInstance?: (id: string) => void;
    onActivateElastic?: () => void;
    lockedToSons?: number;
    getRescueSuggestion?: () => any;
}

const ActivePlan: React.FC<ActivePlanProps> = ({
    currentPlan,
    activeRules,
    rules,
    toggleRule,
    toggleAllRules,
    getRuleStatus,
    onFullBet,
    onPartialWin,
    onPartialLoss,
    onBreakEven,
    onAdjustment,
    onActivateRescue,
    onEarlyClose,
    getNextStake,
    onUpdateStartCapital,
    config,
    activeInstances = [],
    onSelectInstance,
    lockedToSons = 0
}) => {
    const [rescueEventsToAdd, setRescueEventsToAdd] = useState(2);
    const [rescueWinsToAdd, setRescueWinsToAdd] = useState(0);
    const rescueMaxLosses = currentPlan.maxConsecutiveLosses || 0;
    const [showManualRescue, setShowManualRescue] = useState(false);
    const [rulesExpanded, setRulesExpanded] = useState(false);
    const [currentQuota, setCurrentQuota] = useState<number>(currentPlan.quota);

    // Gatekeeper State
    const [activePair, setActivePair] = useState(currentPlan.lastUsedPair || '');
    const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        (config.checklistTemplate || []).forEach(item => {
            initial[item] = false;
        });
        return initial;
    });

    const toggleChecklistItem = (item: string) => {
        setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const isElasticTriggered = (currentPlan.elasticConfig?.enabled || config.elasticConfig?.enabled) &&
        (currentPlan.currentConsecutiveLosses || 0) >= (currentPlan.elasticConfig?.triggerOnLosses || config.elasticConfig?.triggerOnLosses || 0) &&
        (currentPlan.elasticStretchesUsed || 0) < (currentPlan.elasticConfig?.maxStretches || config.elasticConfig?.maxStretches || 0);


    const isChecklistComplete = (config.checklistTemplate || []).every(item => checklist[item]);

    // Reset checklist after each trade
    const resetChecklist = () => {
        const initial: Record<string, boolean> = {};
        (config.checklistTemplate || []).forEach(item => {
            initial[item] = false;
        });
        setChecklist(initial);
    };

    // Start Capital Editing
    const [isEditingStart, setIsEditingStart] = useState(false);
    const [tempStartCapital, setTempStartCapital] = useState(currentPlan.startCapital.toString());

    const handleStartCapitalUpdate = () => {
        const val = parseFloat(tempStartCapital);
        if (!isNaN(val) && val > 0) {
            onUpdateStartCapital(val);
            setIsEditingStart(false);
        }
    };



    const [mhiThreshold] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('masa_mhi_threshold');
            return saved ? parseInt(saved, 10) : 45;
        }
        return 45;
    });

    // Calculate effective stake for advisory consistency
    const currentStake = getNextStake(currentQuota);


    const rescueAdvisory = useMemo(() => {
        return getRescueAdvisory(
            currentPlan,
            currentQuota,
            currentStake,
            { warning: mhiThreshold, critical: 75 }
        );
    }, [currentPlan, currentQuota, currentStake, mhiThreshold]);

    const earlyClosure = useMemo(() => {
        return getEarlyClosureSuggestion({
            ...currentPlan,
            maxNetProfit: calculateMaxNetProfit(
                currentPlan.startCapital,
                currentPlan.totalEvents,
                currentPlan.expectedWins,
                currentPlan.quota,
                currentPlan.maxConsecutiveLosses || 0
            )
        });
    }, [currentPlan]);

    const eventsPlayed = currentPlan.totalEvents - currentPlan.remainingEvents;
    const structuralLosses = currentPlan.totalEvents - currentPlan.expectedWins - (currentPlan.remainingEvents - currentPlan.remainingWins);


    const totalAllowedErrors = currentPlan.totalEvents - currentPlan.expectedWins;
    const tiltThreshold = calculateTiltThreshold(currentPlan.totalEvents, currentPlan.expectedWins, currentPlan.remainingEvents, currentPlan.remainingWins);
    const isCritical = structuralLosses >= totalAllowedErrors * 0.8 && totalAllowedErrors > 0;
    const isRescueNeededAfterWins = currentPlan.isRescued && currentPlan.remainingWins === 0 && currentPlan.currentCapital < currentPlan.startCapital - 0.01;

    const displayStake = getNextStake(currentQuota);
    const isZombieState = currentPlan.remainingWins <= 0 && currentPlan.currentCapital < currentPlan.targetCapital - 0.01 && currentPlan.status === 'active';

    const isTargetReached = currentPlan.currentCapital > 0 && currentPlan.currentCapital >= currentPlan.targetCapital - 0.01;

    // To prevent Father plans from looking like they are in a massive loss when spawning sons,
    // we logically add back the capital 'locked in sons' to the net current capital.
    const netCurrentCapital = currentPlan.currentCapital + lockedToSons;

    // Failure Conditions
    const isCapitalExhausted = currentPlan.currentCapital < 0.05 && structuralLosses >= totalAllowedErrors;
    const isConsecutiveLimitReached = (currentPlan.maxConsecutiveLosses || 0) > 0 && (currentPlan.currentConsecutiveLosses || 0) > (currentPlan.maxConsecutiveLosses || 0);

    const isFailed = isCapitalExhausted || isConsecutiveLimitReached;

    return (
        <div className="space-y-4 px-[15px]">
            {/* PLAN FAILED BANNER */}
            {isFailed && (
                <div className="bg-gradient-to-r from-red-950 to-black text-white p-6 rounded-xl shadow-2xl border-l-4 border-red-600 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-full ring-2 ring-red-500/50">
                            <XCircle size={32} className="text-red-500" />
                        </div>
                        <div>
                            <div className="font-black text-lg uppercase tracking-wider text-red-100 mb-1">Masaniello Fallito</div>
                            <div className="text-sm text-red-200/80 font-medium">
                                {isConsecutiveLimitReached
                                    ? "Limite di errori consecutivi superato. Il piano non è più sostenibile."
                                    : "Capitale esaurito e scorta errori terminata."}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RESCUE ADVISORY BANNER */}
            {rescueAdvisory && !showManualRescue && (
                <div className={`mb-6 border p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500 ${rescueAdvisory.urgency === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                    }`}>
                    <div className={`p-2 rounded-full ${rescueAdvisory.urgency === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                        {rescueAdvisory.urgency === 'critical' ? <LifeBuoy size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm mb-1 uppercase tracking-wide ${rescueAdvisory.urgency === 'critical' ? 'text-red-400' : 'text-amber-400'
                            }`}>
                            {rescueAdvisory.urgency === 'critical' ? 'Rescue Consigliato' : 'Suggerimento Rescue'}
                        </h4>
                        <p className={`text-xs leading-relaxed mb-3 ${rescueAdvisory.urgency === 'critical' ? 'text-red-200/80' : 'text-amber-200/80'
                            }`}>
                            {rescueAdvisory.reason}
                        </p>
                        <button
                            onClick={() => setShowManualRescue(true)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 ${rescueAdvisory.urgency === 'critical'
                                ? 'bg-red-500 hover:bg-red-400 text-red-950 shadow-red-500/20'
                                : 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/20'
                                }`}
                        >
                            <LifeBuoy size={14} />
                            Apri Configurator
                        </button>
                    </div>
                </div>
            )}

            {/* ZOMBIE STATE WARNING */}
            {isZombieState && (
                <div className="bg-amber-900/40 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3 animate-pulse">
                    <LifeBuoy className="text-amber-400 shrink-0 mt-1" size={20} />
                    <div>
                        <h4 className="font-bold text-amber-200 text-sm mb-1">Obiettivo Vittorie Raggiunto</h4>
                        <p className="text-amber-300/80 text-xs leading-relaxed mb-2">
                            Hai completato le vittorie previste ma il capitale è ancora sotto soglia (possibile effetto di un Rescue precedente).
                            Il sistema non può calcolare nuove puntate (Stake 0).
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                            <span className="text-amber-300 text-xs font-bold">SOLUZIONE:</span>
                            <button
                                onClick={() => setShowManualRescue(true)}
                                className="bg-amber-500 hover:bg-amber-400 text-amber-950 px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <LifeBuoy size={14} />
                                Usa Rescue Anti-Tilt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TARGET REACHED SUCCESS BANNER */}
            {isTargetReached && (
                <div className="bg-gradient-to-r from-emerald-900 to-green-900 text-white p-6 rounded-xl shadow-2xl border-l-4 border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-full ring-2 ring-emerald-500/50">
                            <CheckCircle size={32} className="text-emerald-300" />
                        </div>
                        <div>
                            <div className="font-black text-lg uppercase tracking-wider text-emerald-100 mb-1">Target Raggiunto! 🏆</div>
                            <div className="text-sm text-emerald-200/80 font-medium">
                                Hai raggiunto l'obiettivo monetario del piano!
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onEarlyClose}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-8 py-3 rounded-xl text-sm font-black uppercase shadow-xl hover:shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <CheckSquare size={18} />
                        Chiudi Ciclo e Incassa
                    </button>
                </div>
            )}


            {/* UNIFIED ALERT DRAWER */}
            <div className="mb-6">
                {(isTargetReached || ((isCritical || isRescueNeededAfterWins || isElasticTriggered || (currentPlan.currentConsecutiveLosses || 0) >= tiltThreshold) && !currentPlan.isRescued) || earlyClosure?.shouldClose) && (
                    <div className={`
                        relative overflow-hidden p-4 rounded-xl shadow-lg border-l-4 animate-in slide-in-from-top-2 transition-all duration-300
                        ${isTargetReached ? 'bg-emerald-500 border-emerald-300 text-emerald-950' :
                            (isCritical || isRescueNeededAfterWins) ? 'bg-gradient-to-r from-red-900/90 to-rose-900/90 border-red-500 text-white' :
                                isElasticTriggered ? 'bg-gradient-to-r from-indigo-900/90 to-slate-900/90 border-indigo-500 text-white' :
                                    (currentPlan.currentConsecutiveLosses || 0) >= tiltThreshold ? 'bg-gradient-to-r from-orange-900/90 to-slate-900/90 border-orange-500 text-white' :
                                        'bg-gradient-to-r from-emerald-900/90 to-slate-900/90 border-emerald-500 text-white'}
                    `}>
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    {isTargetReached ? <TrendingUp size={20} /> :
                                        (isCritical || isRescueNeededAfterWins) ? <AlertTriangle size={20} /> :
                                            isElasticTriggered ? <Shield size={20} /> :
                                                (currentPlan.currentConsecutiveLosses || 0) >= tiltThreshold ? <ShieldAlert size={20} /> :
                                                    <TrendingUp size={20} />}
                                </div>
                                <div className="cursor-pointer" onClick={() => !isTargetReached && setShowManualRescue(!showManualRescue)}>
                                    <div className="font-black text-xs uppercase tracking-wider opacity-90">
                                        {isTargetReached ? 'Obiettivo Raggiunto!' :
                                            (isCritical || isRescueNeededAfterWins) ? 'Rescue: Soglia Critica' :
                                                isElasticTriggered ? 'Elastic Horizon' :
                                                    (currentPlan.currentConsecutiveLosses || 0) >= tiltThreshold ? 'Rescue: Anti-Tilt' :
                                                        'Suggerimento Chiusura'}
                                    </div>
                                    <div className="text-xs opacity-80 max-w-sm leading-tight mt-0.5">
                                        {isTargetReached ? 'Complimenti! Hai raggiunto il target profit.' :
                                            (isCritical || isRescueNeededAfterWins) ? 'Rischio elevato. Consigliato intervento Rescue.' :
                                                isElasticTriggered ? 'Rilevato Drawdown. Orrizzonte estendibile.' :
                                                    (currentPlan.currentConsecutiveLosses || 0) >= tiltThreshold ? `${currentPlan.currentConsecutiveLosses} loss consecutivi. Attivare il Rescue?` :
                                                        earlyClosure?.reason}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {isTargetReached || earlyClosure?.shouldClose ? (
                                    <button
                                        onClick={onEarlyClose}
                                        className="bg-white text-emerald-800 px-4 py-2 rounded-lg text-xs font-black uppercase shadow-md hover:bg-emerald-50 transition-colors whitespace-nowrap"
                                    >
                                        {isTargetReached ? 'INCASSA ORA' : `CHIUDI (€${Math.ceil(earlyClosure?.profitSecure || 0)})`}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowManualRescue(!showManualRescue)}
                                        className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg transition-colors shadow-lg border border-white/10"
                                    >
                                        <LifeBuoy size={18} className={showManualRescue ? 'animate-spin-slow' : ''} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* 1. TOP SECTION: Header & Stats */}
            <div className="bg-[#0f1623] p-6 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 blur-[80px] group-hover:bg-blue-500/20 transition-all duration-700 pointer-events-none" />

                {/* Header Title */}
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-3 tracking-tight text-white">
                            PIANO ATTIVO
                            {currentPlan.isRescued && (
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md px-2 py-0.5 font-bold tracking-wide uppercase flex items-center gap-1">
                                    <LifeBuoy size={10} /> Rescued
                                </span>
                            )}
                            {(currentPlan.elasticStretchesUsed || 0) > 0 && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md px-2 py-0.5 font-bold tracking-wide uppercase flex items-center gap-1 animate-pulse">
                                    <Shield size={10} /> Elastic Active
                                </span>
                            )}
                        </h2>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gestione Masa attiva</div>
                    </div>
                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentPlan.currentCapital >= currentPlan.startCapital
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                        {currentPlan.currentCapital >= currentPlan.startCapital ? 'Profit' : 'Drawdown'}
                    </div>
                </div>

                {/* Role Specific Header Extra */}
                {(currentPlan.role === 'master' || currentPlan.role === 'slave') && (
                    <div className="mb-4 relative z-10">
                        {currentPlan.role === 'master' && (
                            <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl animate-in slide-in-from-right-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-500">
                                        <Crown size={20} />
                                    </div>
                                    <div
                                        className="cursor-pointer group/masterlink"
                                        onClick={() => {
                                            if (currentPlan.feedForwardConfig?.slavePlanId && onSelectInstance) {
                                                onSelectInstance(currentPlan.feedForwardConfig.slavePlanId);
                                            }
                                        }}
                                    >
                                        <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest leading-none mb-1 flex items-center gap-2">
                                            Master Account
                                            {currentPlan.feedForwardConfig?.slavePlanId && (
                                                <LinkIcon size={10} className="text-yellow-500/50 group-hover/masterlink:text-yellow-400" />
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-yellow-200/80">
                                            Feeding {currentPlan.feedForwardConfig?.percentage}% profit to {
                                                activeInstances.find((i: MasanielloInstance) => i.id === currentPlan.feedForwardConfig?.slavePlanId)?.name || 'Slave'
                                            }
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest leading-none mb-1">Total Fed</div>
                                    <div className="text-sm font-black text-white">€{Math.ceil(currentPlan.feedForwardConfig?.totalFed || 0).toLocaleString('it-IT')}</div>
                                </div>
                            </div>
                        )}
                        {currentPlan.role === 'slave' && (
                            <div className={`flex items-center justify-between p-3 border rounded-2xl transition-all ${currentPlan.feedSource?.isPaused ? 'bg-purple-950/40 border-purple-500/50 animate-pulse' : 'bg-purple-500/10 border-purple-500/30'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl transition-colors ${currentPlan.feedSource?.isPaused ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                        <LinkIcon size={20} />
                                    </div>
                                    <div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${currentPlan.feedSource?.isPaused ? 'text-red-400' : 'text-purple-400'}`}>
                                            Slave Plan {currentPlan.feedSource?.isPaused ? '(PAUSED)' : '(ACTIVE)'}
                                        </div>
                                        <div className="text-xs font-bold text-purple-200/80">
                                            {currentPlan.feedSource?.isPaused
                                                ? 'Attesa alimentazione dal Master per sbloccare'
                                                : 'Sto usando il Virtual Buffer alimentato dal Master'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-black text-purple-500 uppercase tracking-widest leading-none mb-1">Virtual Buffer</div>
                                    <div className={`text-sm font-black ${currentPlan.feedSource?.isPaused ? 'text-red-400' : 'text-white'}`}>
                                        €{Math.ceil(currentPlan.feedSource?.virtualBuffer || 0).toLocaleString('it-IT')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                    {/* Start Capital */}
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between hover:border-slate-600/50 transition-colors group/start">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex justify-between items-center">
                            Capitale Iniziale
                            {!isEditingStart && <div className="opacity-0 group-hover/start:opacity-100 transition-opacity text-[9px] text-blue-400 cursor-pointer" onClick={() => { setTempStartCapital(currentPlan.startCapital.toString()); setIsEditingStart(true); }}>MODIFICA</div>}
                        </div>

                        {isEditingStart ? (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">€</span>
                                <input
                                    type="number"
                                    value={tempStartCapital}
                                    onChange={(e) => setTempStartCapital(e.target.value)}
                                    className="w-20 bg-[#0f1623] text-white font-bold text-sm px-1 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                                <button onClick={handleStartCapitalUpdate} className="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded transition-colors"><CheckCircle size={14} /></button>
                                <button onClick={() => setIsEditingStart(false)} className="text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-colors"><XCircle size={14} /></button>
                            </div>
                        ) : (
                            <div className="text-xl font-bold text-slate-300 cursor-pointer hover:text-blue-300 transition-colors" onClick={() => { setTempStartCapital(currentPlan.startCapital.toString()); setIsEditingStart(true); }}>
                                €{Math.ceil(currentPlan.startCapital).toLocaleString('it-IT')}
                            </div>
                        )}
                    </div>

                    {/* Current Capital (HERO) */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 border border-slate-600 shadow-lg md:scale-105 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            {currentPlan.currentCapital >= currentPlan.startCapital ? <TrendingUp size={48} /> : <TrendingDown size={48} />}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex justify-between items-center">
                            Capitale Attuale
                        </div>
                        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                            <div className="text-2xl font-black tracking-tight text-[#F84AA7]">
                                €{Math.ceil(currentPlan.currentCapital).toLocaleString('it-IT')}
                            </div>
                            {lockedToSons > 0 && (
                                <div className="text-orange-400 font-bold tracking-tight text-sm flex items-baseline">
                                    <span style={{ fontSize: '10px', verticalAlign: 'top', opacity: 0.8 }}>+€</span>
                                    {Math.ceil(lockedToSons).toLocaleString('it-IT')}
                                    <span className="text-[8px] uppercase tracking-widest opacity-80 ml-1" style={{ letterSpacing: '0.5px' }}>Nei Figli</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Target Capital */}
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between hover:border-blue-500/20 transition-colors group/target">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 group-hover/target:text-blue-400 transition-colors">Target Finale</div>
                        <div className="text-xl font-bold text-blue-400 group-hover/target:text-blue-300 transition-colors">€{Math.ceil(currentPlan.targetCapital).toLocaleString('it-IT')}</div>
                    </div>

                    {/* Current Profit (New Card) */}
                    <div className={`bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between hover:border-slate-600/50 transition-colors group/profit ${(netCurrentCapital - currentPlan.startCapital) >= 0 ? 'hover:border-green-500/30' : 'hover:border-red-500/30'}`}>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Profitto Attuale</div>
                        <div className={`text-xl font-bold ${(netCurrentCapital - currentPlan.startCapital) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(netCurrentCapital - currentPlan.startCapital) >= 0 ? '+' : ''}€{Math.ceil(netCurrentCapital - currentPlan.startCapital).toLocaleString('it-IT')}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Progresso</span>
                        <span>{currentPlan.targetCapital > currentPlan.startCapital
                            ? Math.ceil(((netCurrentCapital - currentPlan.startCapital) / (currentPlan.targetCapital - currentPlan.startCapital)) * 100)
                            : 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/30">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${currentPlan.currentCapital >= currentPlan.startCapital ? 'bg-gradient-to-r from-blue-500 to-emerald-400' : 'bg-rose-500'}`}
                            style={{
                                width: `${currentPlan.targetCapital > currentPlan.startCapital
                                    ? Math.max(0, Math.min(100, ((netCurrentCapital - currentPlan.startCapital) / (currentPlan.targetCapital - currentPlan.startCapital)) * 100))
                                    : 0}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* 5. RULES (Collapsible) */}
            <div className="bg-[#0f1623] rounded-xl border border-slate-700 overflow-hidden mb-4">
                <button
                    onClick={() => setRulesExpanded(!rulesExpanded)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-[#0f1623] hover:bg-slate-750 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-slate-700 text-slate-400">
                            <CheckCircle size={14} />
                        </div>
                        <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                            Regole Attive ({activeRules.length})
                        </span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${rulesExpanded ? 'rotate-180' : ''}`} />
                </button>
                {rulesExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t border-slate-700/50">
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAllRules(rules.map(r => r.id));
                                }}
                                className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors"
                            >
                                {activeRules.length === rules.length ? 'Disattiva Tutti' : 'Attiva Tutti'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {rules.map((rule) => {
                                const status = getRuleStatus(rule.id);
                                return (
                                    <div
                                        key={rule.id}
                                        onClick={() => toggleRule(rule.id)}
                                        className={`px-3 py-2 rounded-lg text-[10px] flex items-center justify-between cursor-pointer border transition-all ${status.isSuspended ? 'bg-orange-500/5 border-orange-500/20 opacity-80' : status.enabled ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-[#0f1623]/50 border-slate-700 text-slate-500 opacity-50'}`}
                                    >
                                        <span className="font-bold">{rule.label}</span>
                                        {status.enabled && <CheckSquare size={12} className="text-green-500" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. STATS & CONDIZIONI GRID */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 mb-6 
                ${(currentPlan.maxConsecutiveLosses || 0) > 0 ? 'xl:grid-cols-4' : ''} 
                ${currentPlan.elasticConfig?.enabled ? '2xl:grid-cols-5' : ''}`}>

                {/* Events */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Eventi</div>
                    <div className="text-lg font-black text-white">
                        {eventsPlayed} <span className="text-xs text-slate-500 font-medium">/ {currentPlan.totalEvents}</span>
                        {currentPlan.elasticStretchesUsed > 0 && (
                            <span className="ml-2 text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">+{currentPlan.elasticStretchesUsed * (currentPlan.elasticConfig?.addEvents || 0)}E</span>
                        )}
                    </div>
                    <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(eventsPlayed / currentPlan.totalEvents) * 100}%` }} />
                    </div>
                </div>

                {/* Wins */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Vittorie</div>
                    <div className="text-lg font-black text-emerald-400">
                        {currentPlan.expectedWins - currentPlan.remainingWins} <span className="text-xs text-slate-500 font-medium">/ {currentPlan.expectedWins}</span>
                        {currentPlan.elasticStretchesUsed > 0 && (
                            <span className="ml-2 text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">+{currentPlan.elasticStretchesUsed * (currentPlan.elasticConfig?.addWins || 0)}V</span>
                        )}
                    </div>
                    <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${((currentPlan.expectedWins - currentPlan.remainingWins) / currentPlan.expectedWins) * 100}%` }} />
                    </div>
                </div>

                {/* Errors */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Errori</div>
                    <div className="text-lg font-black text-rose-500">
                        {structuralLosses} <span className="text-xs text-slate-500 font-medium">/ {totalAllowedErrors}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${(structuralLosses / (totalAllowedErrors || 1)) * 100}%` }} />
                    </div>
                </div>

                {/* Consecutive Errors (Conditional 4th Column) */}
                {(currentPlan.maxConsecutiveLosses || 0) > 0 && (
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col justify-between">

                        <div className="flex justify-between items-start mb-1">
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Max Rossi</div>
                            {(currentPlan.currentConsecutiveLosses || 0) > 0 && (
                                <AlertTriangle size={10} className="text-orange-400 animate-pulse" />
                            )}
                        </div>

                        <div className={`text-lg font-black ${(currentPlan.currentConsecutiveLosses || 0) >= (currentPlan.maxConsecutiveLosses || 0) ? 'text-red-500' : 'text-orange-400'}`}>
                            {currentPlan.currentConsecutiveLosses || 0} <span className="text-xs text-slate-500 font-medium">/ {currentPlan.maxConsecutiveLosses}</span>
                        </div>

                        {/* Dots visualizer - aligned with progress bars */}
                        <div className="flex gap-1 mt-2.5 items-center h-1">
                            {Array.from({ length: currentPlan.maxConsecutiveLosses || 0 }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`flex-1 h-1 rounded-full ${idx < (currentPlan.currentConsecutiveLosses || 0)
                                        ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]'
                                        : 'bg-slate-700'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Elastic Horizon Stretches (Conditional 5th Column) */}
                {currentPlan.elasticConfig?.enabled && (
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-indigo-500/20 flex flex-col justify-between group/elastic">
                        <div className="flex justify-between items-start mb-1">
                            <div className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Elastic Stretches</div>
                            <Shield size={10} className={`transition-colors ${currentPlan.elasticStretchesUsed > 0 ? 'text-indigo-400' : 'text-slate-600'}`} />
                        </div>

                        <div className={`text-lg font-black ${currentPlan.elasticStretchesUsed > 0 ? 'text-indigo-300' : 'text-slate-500'}`}>
                            {currentPlan.elasticStretchesUsed || 0} <span className="text-xs text-slate-600 font-medium">/ {currentPlan.elasticConfig.maxStretches}</span>
                        </div>

                        <div className="flex gap-1 mt-2.5 items-center h-1">
                            {Array.from({ length: currentPlan.elasticConfig.maxStretches }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`flex-1 h-1 rounded-full transition-all duration-500 ${idx < (currentPlan.elasticStretchesUsed || 0)
                                        ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse'
                                        : 'bg-slate-800 border border-white/5'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* GATEKEEPER: PRE-TRADE CHECKLIST */}
            {
                !isTargetReached && !isFailed && (
                    <div className="bg-[#0f1623] p-6 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                    <ClipboardCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Gatekeeper Checklist</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rituale di Disciplina</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-700/50">
                                <Globe size={14} className="text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="EURUSD, NASDAQ..."
                                    value={activePair}
                                    onChange={(e) => setActivePair(e.target.value.toUpperCase())}
                                    className="bg-transparent text-xs font-black text-blue-400 placeholder:text-slate-600 outline-none w-24 tracking-widest"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                            {(config.checklistTemplate || []).map((item) => (
                                <div
                                    key={item}
                                    onClick={() => toggleChecklistItem(item)}
                                    className={`
                                    group cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300
                                    ${checklist[item]
                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'}
                                `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                        w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                                        ${checklist[item]
                                                ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                                : 'border-slate-700 group-hover:border-slate-500'}
                                    `}>
                                            {checklist[item] && <span className="text-white text-xs font-black">✓</span>}
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${checklist[item] ? 'text-emerald-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                            {item}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isChecklistComplete && (config.checklistTemplate || []).length > 0 && (
                            <div className="mt-4 flex items-center gap-3 bg-orange-500/5 p-3 rounded-2xl border border-orange-500/20">
                                <AlertOctagon size={16} className="text-orange-500" />
                                <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-wider">
                                    Checklist incompleta: la disciplina batte il caso. Sicuro di voler procedere?
                                </p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* 4. BET & ACTIONS CONTAINER (Side-by-side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* LEFT: NEXT BET CARD */}
                <div
                    className="p-6 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-500 group bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white/10 flex flex-col justify-between h-full"
                >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Top Row: Next Step (Left) & Quota (Right) */}
                    <div className="flex items-start justify-between relative z-10 mb-8">
                        {/* Left: Next Step */}
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-blue-100/70 font-bold uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw size={12} />
                                Prossimo Step
                            </div>
                            <button
                                onClick={() => setShowManualRescue(!showManualRescue)}
                                className={`text-[9px] font-black py-0.5 px-2 rounded border transition-all flex items-center gap-1 mt-1 ${showManualRescue ? 'bg-orange-500/30 border-orange-400 text-orange-200' : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'}`}
                            >
                                <LifeBuoy size={10} className={showManualRescue ? 'animate-spin-slow' : ''} /> RESCUE
                            </button>
                        </div>

                        {/* Right: Quota */}
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                            <span className="text-[10px] uppercase font-bold text-white/60">Quota</span>
                            <input
                                type="number"
                                step="0.01"
                                value={currentQuota}
                                onChange={(e) => setCurrentQuota(Number(e.target.value))}
                                className="w-12 bg-transparent text-right font-black text-white text-sm outline-none"
                            />
                        </div>
                    </div>

                    {/* Bottom Row: Stake */}
                    <div className="relative z-10">
                        {showManualRescue && (
                            <div className="bg-[#0f1623]/60 rounded-xl p-4 border border-white/10 animate-in fade-in slide-in-from-top-1 space-y-4 mb-4 backdrop-blur-md">
                                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                                    <LifeBuoy size={14} className="text-orange-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Rescue Configurator</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Events Selector */}
                                    <div>
                                        <div className="text-[9px] font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5"><LifeBuoy size={10} /> + Eventi</div>
                                            <span className="text-white bg-indigo-500/20 px-1.5 rounded">+{rescueEventsToAdd}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {[1, 2, 3, 4, 5, 8].map((num) => (
                                                <button
                                                    key={num}
                                                    onClick={() => setRescueEventsToAdd(num)}
                                                    className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all ${rescueEventsToAdd === num ? 'bg-white text-indigo-900 scale-105 shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    +{num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Wins Selector */}
                                    <div>
                                        <div className="text-[9px] font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5"><TrendingUp size={10} /> + Vittorie</div>
                                            <span className="text-white bg-emerald-500/20 px-1.5 rounded">+{rescueWinsToAdd}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {[0, 1, 2, 3].map((num) => (
                                                <button
                                                    key={num}
                                                    onClick={() => setRescueWinsToAdd(num)}
                                                    className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all ${rescueWinsToAdd === num ? 'bg-emerald-400 text-emerald-950 scale-105 shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    +{num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Projection Panel */}
                                {(() => {
                                    const newTotalEvents = currentPlan.remainingEvents + rescueEventsToAdd;
                                    const newTotalWins = currentPlan.remainingWins + rescueWinsToAdd;
                                    const projectedMaxProfit = calculateMaxNetProfit(
                                        currentPlan.currentCapital,
                                        newTotalEvents,
                                        newTotalWins,
                                        currentPlan.quota,
                                        rescueMaxLosses
                                    );
                                    const projectedTarget = currentPlan.currentCapital + projectedMaxProfit;
                                    const targetProfitVsStart = projectedTarget - currentPlan.startCapital;

                                    return (
                                        <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 space-y-2">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-slate-400 uppercase font-black tracking-widest">Target Profit</span>
                                                <span className={`font-black ${targetProfitVsStart >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {targetProfitVsStart >= 0 ? '+' : '-'}€{Math.ceil(Math.abs(targetProfitVsStart)).toLocaleString('it-IT')}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    onActivateRescue(rescueEventsToAdd, projectedTarget, rescueWinsToAdd, 0, rescueMaxLosses);
                                                    setShowManualRescue(false);
                                                }}
                                                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg transition-all active:scale-95"
                                            >
                                                Applica E Ricalcola
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        <div className="text-sm font-medium text-blue-200 mb-1">
                            Puntata
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl text-blue-200 font-medium">€</span>
                            <span className="text-5xl font-black text-white tracking-tighter drop-shadow-xl">{displayStake.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: ACTIONS (Win/Loss Buttons) */}
                <div className="relative">
                    {currentPlan.role === 'slave' && currentPlan.feedSource?.isPaused && (
                        <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-red-500/30">
                            <ShieldAlert className="text-red-500 mb-2" size={32} />
                            <div className="text-sm font-black text-white uppercase tracking-wider">PIANO IN PAUSA</div>
                            <div className="text-[10px] text-red-200/80 font-bold uppercase mt-1">Virtual Buffer Esaurito</div>
                        </div>
                    )}
                    <div className={`grid grid-cols-2 gap-3 h-full ${currentPlan.role === 'slave' && currentPlan.feedSource?.isPaused ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                        {/* 1. VINTA (Top-Left) */}
                        <button
                            onClick={() => {
                                onFullBet(true, currentQuota, activePair, checklist);
                                resetChecklist();
                            }}
                            className="group relative overflow-hidden py-4 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-2xl font-black text-lg shadow-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-2 text-white"><CheckCircle size={18} /> VINTA</span>
                                <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold text-green-100">100% TARGET</span>
                            </div>
                        </button>

                        {/* 2. PERSA (Top-Right) */}
                        <button
                            onClick={() => {
                                onFullBet(false, currentQuota, activePair, checklist);
                                resetChecklist();
                            }}
                            className="group relative overflow-hidden py-4 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded-2xl font-black text-lg shadow-xl border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            <div className="flex flex-col items-center text-white">
                                <span className="flex items-center gap-2"><XCircle size={18} /> PERSA</span>
                                <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold uppercase">Loss Totale</span>
                            </div>
                        </button>

                        {/* 3. VINCITA PARZIALE (Tesoretto) */}
                        <button
                            onClick={() => {
                                onPartialWin(currentQuota, activePair, checklist);
                                resetChecklist();
                            }}
                            className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-[#0f1623] border-2 border-green-500/30 hover:border-green-500/50 rounded-2xl font-black text-lg shadow-xl"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-2 text-green-400"><TrendingUp size={18} /> TESORETTO</span>
                                <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">VINTA 50% (+$$)</span>
                            </div>
                        </button>

                        {/* 4. SCONFITTA PARZIALE (Errore) */}
                        <button
                            onClick={() => {
                                onPartialLoss(currentQuota, activePair, checklist);
                                resetChecklist();
                            }}
                            className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-[#0f1623] border-2 border-red-500/30 hover:border-red-500/50 rounded-2xl font-black text-lg shadow-xl"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-1.5 text-red-500"><TrendingDown size={18} /> ERRORE</span>
                                <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">PERSA 50% (-$$)</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* 7. TRADING DASHBOARD */}
            <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                <h3 className="text-[10px] font-black text-indigo-400 border-b border-indigo-500/20 pb-2 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <HistoryIcon size={14} /> Trading Dashboard (PRO)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button onClick={onBreakEven} className="py-3 bg-[#0f1623] hover:bg-slate-700 border border-slate-600 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-2 transition-all">
                        <Shield size={14} className="opacity-50" /> BREAK EVEN
                    </button>
                    <button onClick={() => setShowManualRescue(!showManualRescue)} className={`py-3 transition-all rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 border ${showManualRescue ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'}`}>
                        <LifeBuoy size={14} className={showManualRescue ? 'animate-spin-slow' : 'opacity-50'} /> RESCUE MODE
                    </button>
                    <button onClick={() => {
                        const val = prompt("Profitto:", "0");
                        if (val) onAdjustment(Number(val), true);
                    }} className="py-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-xl text-[10px] font-bold text-indigo-300 flex items-center justify-center gap-2 transition-all">
                        <Plus size={14} /> MANUAL WIN
                    </button>
                    <button onClick={() => {
                        const val = prompt("Perdita:", "0");
                        if (val) onAdjustment(-Math.abs(Number(val)), false);
                    }} className="py-3 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded-xl text-[10px] font-bold text-red-300 flex items-center justify-center gap-2 transition-all">
                        <Minus size={14} /> MANUAL LOSS
                    </button>
                </div>
            </div>

            {/* 8. EVENT LOG */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700/50 bg-[#0f1623]/50 flex justify-between items-center">
                    <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Registro Eventi</h3>
                    <button
                        onClick={() => {
                            const csv = generateCSV(currentPlan);
                            downloadCSV(csv, `masa_active_${currentPlan.id}.csv`);
                        }}
                        className="flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 px-2 py-1 rounded text-slate-200 transition-colors"
                    >
                        <Download size={10} /> CSV
                    </button>
                </div>
                <div className="p-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {[...currentPlan.events].reverse().map((event) => (
                        <div key={event.id} className={`p-3 rounded-lg text-xs flex justify-between border ${event.isWin ? 'bg-green-500/10 border-green-500/20 text-green-300' : event.isVoid ? 'bg-slate-700/30 border-slate-600 text-slate-400' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                            <span className="font-medium flex items-center gap-2">
                                {event.isWin ? <TrendingUp size={12} /> : event.isVoid ? <RefreshCw size={12} /> : <TrendingDown size={12} />}
                                {event.message || (event.isVoid ? 'ANNULLATO' : event.isWin ? 'VINTA' : 'PERSA')} ({event.quota})
                            </span>
                            <span className="font-mono opacity-60">€{event.capitalAfter.toFixed(2)}</span>
                        </div>
                    ))}

                    <DebugRules
                        plan={currentPlan}
                        activeRules={activeRules}
                        config={{
                            ...currentPlan,
                            initialCapital: currentPlan.startCapital,
                            weeklyTargetPercentage: 20,
                            milestoneBankPercentage: 20,
                            accumulationPercent: 50
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ActivePlan;
