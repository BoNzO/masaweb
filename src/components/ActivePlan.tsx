import React, { useState, useEffect } from 'react';
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
    Download
} from 'lucide-react';
import { generateCSV, downloadCSV } from '../utils/exportUtils';
import type { MasaPlan, Rule } from '../types/masaniello';
import { getEarlyClosureSuggestion, calculateTiltThreshold } from '../utils/masaLogic';
import { calculateMaxNetProfit } from '../utils/mathUtils';
import DebugRules from './DebugRules';

interface ActivePlanProps {
    currentPlan: MasaPlan;
    activeRules: string[];
    rules: Rule[];
    toggleRule: (id: string) => void;
    toggleAllRules: (ids: string[]) => void;
    getRuleStatus: (id: string) => { active: boolean; enabled: boolean; isSuspended?: boolean };
    onFullBet: (isWin: boolean, customQuota?: number) => void;
    onPartialWin: (customQuota: number) => void;
    onPartialLoss: (customQuota: number) => void;
    onBreakEven: () => void;
    onAdjustment: (amount: number, isWinEquivalent: boolean) => void;
    onActivateRescue: (events: number, target?: number, wins?: number, extraCap?: number, maxLosses?: number) => void;
    onEarlyClose: () => void;
    getNextStake: (quota?: number) => number;
    getRescueSuggestion: (extraCap?: number) => {
        eventsToAdd: number;
        winsToAdd: number;
        targetCapital: number;
        suggestedExtraCapital?: number;
        estimatedStake: number;
    } | null;
    onUpdatePlan: (newPlan: MasaPlan) => void;
    onUpdateStartCapital: (newAmount: number) => void;
    config: any;
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
    getRescueSuggestion,
    onUpdateStartCapital,
    config
}) => {
    const [rescueEventsToAdd, setRescueEventsToAdd] = useState(2);
    const [rescueWinsToAdd, setRescueWinsToAdd] = useState(0);
    const [rescueMaxLosses, setRescueMaxLosses] = useState(currentPlan.maxConsecutiveLosses || 0);
    const [showManualRescue, setShowManualRescue] = useState(false);
    const [rulesExpanded, setRulesExpanded] = useState(false);
    const [currentQuota, setCurrentQuota] = useState<number>(currentPlan.quota);

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

    const [rescueSuggestion, setRescueSuggestion] = useState<ReturnType<typeof getRescueSuggestion> | null>(null);
    const [earlyClosure, setEarlyClosure] = useState<{ shouldClose: boolean; reason: string; profitSecure: number } | null>(null);

    // Initial calculation
    useEffect(() => {
        // Check Rescue
        const rescue = getRescueSuggestion(0);
        setRescueSuggestion(rescue);

        // Check Early Closure
        const closure = getEarlyClosureSuggestion({ ...currentPlan, maxNetProfit: calculateMaxNetProfit(currentPlan.startCapital, currentPlan.totalEvents, currentPlan.expectedWins, currentPlan.quota, currentPlan.maxConsecutiveLosses || 0) });
        setEarlyClosure(closure);
    }, [currentPlan]);

    const eventsPlayed = currentPlan.totalEvents - currentPlan.remainingEvents;
    const structuralLosses = currentPlan.totalEvents - currentPlan.expectedWins - (currentPlan.remainingEvents - currentPlan.remainingWins);


    const totalAllowedErrors = currentPlan.totalEvents - currentPlan.expectedWins;
    const tiltThreshold = calculateTiltThreshold(currentPlan.totalEvents, currentPlan.expectedWins, currentPlan.remainingEvents, currentPlan.remainingWins);
    const isCritical = structuralLosses >= totalAllowedErrors * 0.8 && totalAllowedErrors > 0;
    const isRescueNeededAfterWins = currentPlan.isRescued && currentPlan.remainingWins === 0 && currentPlan.currentCapital < currentPlan.startCapital - 0.01;

    const displayStake = getNextStake(currentQuota);
    const isZombieState = currentPlan.remainingWins <= 0 && currentPlan.currentCapital < currentPlan.targetCapital - 0.01 && currentPlan.status === 'active';

    const isTargetReached = currentPlan.currentCapital >= currentPlan.targetCapital - 0.01;

    // Failure Conditions
    const isCapitalExhausted = currentPlan.currentCapital < 0.05 && structuralLosses >= totalAllowedErrors;
    const isConsecutiveLimitReached = (currentPlan.maxConsecutiveLosses || 0) > 0 && (currentPlan.currentConsecutiveLosses || 0) > (currentPlan.maxConsecutiveLosses || 0);

    const isFailed = isCapitalExhausted || isConsecutiveLimitReached;

    return (
        <div className="space-y-4">
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


            {/* CONFIGURATION & STATUS */}
            {!isTargetReached && ( // Hide config/rescue if target reached to focus on closure? No, maybe keep config visible but hide warnings.
                // Actually user request was "Una volta raggiunto l'obiettivo questa finestra non dovrebbe uscire" referring to the alert.
                // Let's keep the standard UI but conditionally render the Alert.
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ... existing config cards ... */}
                </div>
            )}
            {/* Note: I cannot see the Config Cards code in the snippet to wrap it.
             I will just modify the Alert condition as requested.
             */}


            {/* Status Cards (Win/Loss/Events) - Assuming these are below, I will just proceed with the Alert modification in the next block or included here if possible. 
               Wait, I see the loop. The snippet ends at 370.
               I need to replace lines 117 to ... wait.
               The snippet I read was 100-140 AND 330-370.
               I don't have the contiguous block.
               I should split this into two edits if strictness requires.
               But I can probably do it if I define isTargetReached at the top and then conditionally render.
               
               Let's replace the `return (` block start to include `isTargetReached` logic.
            */}


            {/* 0. ALERTS STACK (MOVED TO TOP) */}
            <div className="space-y-3 mb-6">
                {/* Early Closure */}
                {earlyClosure?.shouldClose && (
                    <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white p-4 rounded-xl shadow-lg border-l-4 border-emerald-400 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <div className="font-black text-sm uppercase tracking-wider">Take Profit</div>
                                <div className="text-xs text-emerald-100 opacity-90">{earlyClosure.reason}</div>
                            </div>
                        </div>
                        <button onClick={onEarlyClose} className="bg-white text-emerald-800 px-4 py-2 rounded-lg text-xs font-black uppercase shadow-md hover:bg-emerald-50 transition-colors">
                            Chiudi (€{earlyClosure.profitSecure.toFixed(2)})
                        </button>
                    </div>
                )}

                {/* Rescue / Critical Logic */}
                {(() => {
                    const isCriticalVisible = !isTargetReached && (showManualRescue || ((isCritical || isRescueNeededAfterWins) && !currentPlan.isRescued));

                    return (
                        <>
                            {/* Rescue / Critical */}
                            {isCriticalVisible && (
                                <div className="bg-gradient-to-r from-red-900 to-rose-900 text-white p-4 rounded-xl shadow-lg border-l-4 border-red-500 flex flex-col gap-4 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-red-500/20 rounded-lg">
                                                <AlertTriangle size={20} className="text-red-300" />
                                            </div>
                                            <div>
                                                <div className="font-black text-sm uppercase tracking-wider text-red-100">Rescue: Soglia Critica</div>
                                                <div className="text-xs text-red-200 opacity-80 max-w-sm">
                                                    Rischio elevato. Consigliato intervento per correggere il tiro.
                                                </div>
                                            </div>
                                        </div>
                                        {/* Actions Right Side */}
                                        <div className="flex gap-2">
                                            {rescueSuggestion && (
                                                <button onClick={() => onActivateRescue(rescueSuggestion.eventsToAdd, rescueSuggestion.targetCapital, rescueSuggestion.winsToAdd, 0)} className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg text-xs font-bold shadow text-white border border-red-400/30">
                                                    Rescue Auto (+{rescueSuggestion.winsToAdd}V)
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowManualRescue(!showManualRescue)}
                                                className={`bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-xs font-bold shadow text-white border ${showManualRescue ? 'border-indigo-500 text-indigo-300' : 'border-slate-600'}`}
                                            >
                                                {showManualRescue ? 'Chiudi Manuale' : 'Manuale...'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Manual Rescue Expandable Area */}
                                    {showManualRescue && (
                                        <div className="bg-black/20 rounded-lg p-4 border border-white/10 animate-in fade-in slide-in-from-top-1 space-y-4">

                                            {/* 1. SELECTORS */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Events Selector */}
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                                                        <LifeBuoy size={12} /> Aggiungi Eventi:
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                                                            <button
                                                                key={num}
                                                                onClick={() => setRescueEventsToAdd(num)}
                                                                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${rescueEventsToAdd === num ? 'bg-white text-rose-900 scale-110 shadow-lg ring-2 ring-rose-500/50' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                                            >
                                                                +{num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Wins Selector */}
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                                                        <TrendingUp size={12} /> Aggiungi Vittorie:
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[0, 1, 2, 3, 4, 5].map((num) => (
                                                            <button
                                                                key={num}
                                                                onClick={() => setRescueWinsToAdd(num)}
                                                                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${rescueWinsToAdd === num ? 'bg-emerald-400 text-emerald-950 scale-110 shadow-lg ring-2 ring-emerald-500/50' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                                            >
                                                                +{num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Max Losses Selector */}
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                                                        <ShieldAlert size={12} /> Max Loss (M):
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50">
                                                        <button
                                                            onClick={() => setRescueMaxLosses(Math.max(0, rescueMaxLosses - 1))}
                                                            className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                                                        >
                                                            -
                                                        </button>
                                                        <span className={`text-xs font-bold w-full text-center ${rescueMaxLosses === 0 ? 'text-slate-500' : 'text-orange-400'}`}>
                                                            {rescueMaxLosses === 0 ? '∞' : rescueMaxLosses}
                                                        </span>
                                                        <button
                                                            onClick={() => setRescueMaxLosses(rescueMaxLosses + 1)}
                                                            className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. PROJECTION PANEL */}
                                            {(() => {
                                                // Real-time Projection Calculation
                                                const newTotalEvents = currentPlan.remainingEvents + rescueEventsToAdd;
                                                const newTotalWins = currentPlan.remainingWins + rescueWinsToAdd;

                                                // Calculate new Max Profit based on Current Capital 
                                                const projectedMaxProfit = calculateMaxNetProfit(
                                                    currentPlan.currentCapital,
                                                    newTotalEvents,
                                                    newTotalWins,
                                                    currentPlan.quota,
                                                    rescueMaxLosses
                                                );

                                                const projectedTarget = currentPlan.currentCapital + projectedMaxProfit;

                                                return (
                                                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex flex-col gap-2">
                                                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                                            <div className="flex gap-4 text-center sm:text-left">
                                                                <div>
                                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Nuovo Target</div>
                                                                    <div className="text-sm font-black text-blue-300">€{projectedTarget.toFixed(2)}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Nuovo Utile</div>
                                                                    <div className="text-sm font-black text-emerald-400">+€{projectedMaxProfit.toFixed(2)}</div>
                                                                </div>
                                                                <div className="hidden sm:block">
                                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Configurazione</div>
                                                                    <div className="text-xs font-bold text-slate-300">
                                                                        {currentPlan.expectedWins + rescueWinsToAdd}/{currentPlan.totalEvents + rescueEventsToAdd} @ {currentPlan.quota}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => {
                                                                    onActivateRescue(rescueEventsToAdd, projectedTarget, rescueWinsToAdd, 0, rescueMaxLosses);
                                                                    setShowManualRescue(false);
                                                                }}
                                                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95"
                                                            >
                                                                Applica Modifiche
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Anti-Tilt (Only if Critical is NOT visible) */}
                            {!isCriticalVisible && (currentPlan.currentConsecutiveLosses || 0) >= tiltThreshold && !currentPlan.isRescued && (
                                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-xl shadow-lg border-l-4 border-indigo-500 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                                            <ShieldAlert size={20} className="text-indigo-300" />
                                        </div>
                                        <div>
                                            <div className="font-black text-sm uppercase tracking-wider text-indigo-100 flex items-center gap-2">
                                                Rescue: Anti-Tilt
                                                <button
                                                    onClick={() => alert(`Rescue (Anti-Tilt):\n\nIl motore "Rescue" ha rilevato ${currentPlan.currentConsecutiveLosses} sconfitte consecutive, attivando la protezione Anti-Tilt.\n\nTi suggeriamo di applicare un "Rescue Rapido" (+1 Evento). Questa azione estende il piano mantenendo il target invariato, abbattendo drasticamente lo stake necessario e riducendo la pressione psicologica.`)}
                                                    className="bg-indigo-800/50 hover:bg-indigo-700/50 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-indigo-200"
                                                >
                                                    ?
                                                </button>
                                            </div>
                                            <div className="text-xs text-indigo-200 opacity-80 max-w-sm">
                                                {currentPlan.currentConsecutiveLosses} loss consecutivi. Attiva il Rescue Rapido.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button onClick={() => setShowManualRescue(true)} className="bg-slate-800 hover:bg-slate-700 text-indigo-200 px-4 py-2 rounded-lg text-xs font-bold uppercase shadow-md border border-indigo-500/30 transition-colors">
                                            Usa Rescue Anti-Tilt
                                        </button>
                                        <button onClick={() => onActivateRescue(1, currentPlan.targetCapital, 0, 0)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-black uppercase shadow-md transition-colors">
                                            Rescue Rapido (+1)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}

            </div>


            {/* 1. TOP SECTION: Header & Stats */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden group">
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

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
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
                                    className="w-20 bg-slate-800 text-white font-bold text-sm px-1 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                                <button onClick={handleStartCapitalUpdate} className="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded transition-colors"><CheckCircle size={14} /></button>
                                <button onClick={() => setIsEditingStart(false)} className="text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-colors"><XCircle size={14} /></button>
                            </div>
                        ) : (
                            <div className="text-xl font-bold text-slate-300 cursor-pointer hover:text-blue-300 transition-colors" onClick={() => { setTempStartCapital(currentPlan.startCapital.toString()); setIsEditingStart(true); }}>
                                €{currentPlan.startCapital.toFixed(2)}
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
                            <span className={`text-[10px] font-black ${currentPlan.currentCapital >= currentPlan.startCapital ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(currentPlan.currentCapital - currentPlan.startCapital) >= 0 ? '+' : ''}€{(currentPlan.currentCapital - currentPlan.startCapital).toFixed(2)}
                            </span>
                        </div>
                        <div className="text-xl font-bold tracking-tight text-[#F84AA7]">
                            €{currentPlan.currentCapital.toFixed(2)}
                        </div>
                    </div>

                    {/* Target Capital */}
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col justify-between hover:border-blue-500/20 transition-colors group/target">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 group-hover/target:text-blue-400 transition-colors">Target Finale</div>
                        <div className="text-xl font-bold text-blue-400 group-hover/target:text-blue-300 transition-colors">€{currentPlan.targetCapital.toFixed(2)}</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        <span>Progresso</span>
                        <span>{Math.max(0, Math.min(100, ((currentPlan.currentCapital - currentPlan.startCapital) / (currentPlan.targetCapital - currentPlan.startCapital)) * 100)).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/30">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${currentPlan.currentCapital >= currentPlan.startCapital ? 'bg-gradient-to-r from-blue-500 to-emerald-400' : 'bg-rose-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, ((currentPlan.currentCapital - currentPlan.startCapital) / (currentPlan.targetCapital - currentPlan.startCapital)) * 100))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 5. RULES (Collapsible) - MOVED HERE */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-4">
                <button
                    onClick={() => setRulesExpanded(!rulesExpanded)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-slate-800 hover:bg-slate-750 transition-colors"
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
                                        className={`px-3 py-2 rounded-lg text-[10px] flex items-center justify-between cursor-pointer border transition-all ${status.isSuspended ? 'bg-orange-500/5 border-orange-500/20 opacity-80' : status.enabled ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-800/50 border-slate-700 text-slate-500 opacity-50'}`}
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
            <div className={`grid grid-cols-1 sm:grid-cols-3 ${((currentPlan.maxConsecutiveLosses || 0) > 0) ? 'lg:grid-cols-4' : ''} gap-4 relative z-10 mb-6`}>

                {/* Events */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Eventi</div>
                    <div className="text-lg font-black text-white">{eventsPlayed} <span className="text-xs text-slate-500 font-medium">/ {currentPlan.totalEvents}</span></div>
                    <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(eventsPlayed / currentPlan.totalEvents) * 100}%` }} />
                    </div>
                </div>

                {/* Wins */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Vittorie</div>
                    <div className="text-lg font-black text-emerald-400">
                        {currentPlan.expectedWins - currentPlan.remainingWins} <span className="text-xs text-slate-500 font-medium">/ {currentPlan.expectedWins}</span>
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
                        <div className={`h-full ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${(structuralLosses / totalAllowedErrors) * 100}%` }} />
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
            </div>

            {/* 3. ALERTS STACK (Anti-Tilt, Smart Breath, Rescue, Early Closure) */}




            {/* 4. BET & ACTIONS CONTAINER (Side-by-side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* LEFT: NEXT BET CARD */}
                <div
                    className="p-6 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-500 group bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white/10 flex flex-col justify-center"
                >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-1">
                            <div className="text-xs text-blue-100/70 font-bold uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw size={12} />
                                Prossimo Step
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tight">
                                Puntata
                            </h3>
                        </div>

                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2 mb-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                                <span className="text-[10px] uppercase font-bold text-white/60">Quota</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={currentQuota}
                                    onChange={(e) => setCurrentQuota(Number(e.target.value))}
                                    className="w-12 bg-transparent text-right font-black text-white text-sm outline-none"
                                />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl text-blue-200 font-medium">€</span>
                                <span className="text-5xl font-black text-white tracking-tighter drop-shadow-xl">{displayStake.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: ACTIONS (Win/Loss Buttons) */}
                <div className="grid grid-cols-2 gap-3">
                    {/* 1. VINTA (Top-Left) */}
                    <button
                        onClick={() => onFullBet(true, currentQuota)}
                        className="group relative overflow-hidden py-4 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-2xl font-black text-lg shadow-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        <div className="flex flex-col items-center">
                            <span className="flex items-center gap-2"><CheckCircle size={18} /> VINTA</span>
                            <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold">100% TARGET</span>
                        </div>
                    </button>

                    {/* 2. PERSA (Top-Right) */}
                    <button
                        onClick={() => onFullBet(false, currentQuota)}
                        className="group relative overflow-hidden py-4 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded-2xl font-black text-lg shadow-xl border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        <div className="flex flex-col items-center text-white">
                            <span className="flex items-center gap-2"><XCircle size={18} /> PERSA</span>
                            <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold uppercase">Loss Totale</span>
                        </div>
                    </button>

                    {/* 3. VINCITA PARZIALE (Tesoretto) */}
                    <button
                        onClick={() => onPartialWin(currentQuota)}
                        className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-slate-800 border-2 border-green-500/30 hover:border-green-500/50 rounded-2xl font-black text-lg shadow-xl"
                    >
                        <div className="flex flex-col items-center">
                            <span className="flex items-center gap-2 text-green-400"><TrendingUp size={18} /> TESORETTO</span>
                            <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">VINTA 50% (+$$)</span>
                        </div>
                    </button>

                    {/* 4. SCONFITTA PARZIALE (Errore) */}
                    <button
                        onClick={() => onPartialLoss(currentQuota)}
                        className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-slate-800 border-2 border-red-500/30 hover:border-red-500/50 rounded-2xl font-black text-lg shadow-xl"
                    >
                        <div className="flex flex-col items-center">
                            <span className="flex items-center gap-1.5 text-red-500"><TrendingDown size={18} /> ERRORE</span>
                            <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">PERSA 50% (-$$)</span>
                        </div>
                    </button>
                </div>
            </div>



            {/* 7. TRADING DASHBOARD */}
            <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                <h3 className="text-[10px] font-black text-indigo-400 border-b border-indigo-500/20 pb-2 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <HistoryIcon size={14} /> Trading Dashboard (PRO)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={onBreakEven} className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-2 transition-all">
                        <Shield size={14} className="opacity-50" /> BREAK EVEN
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
                <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
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
    );
};

export default ActivePlan;
