import React, { useState } from 'react';
import {
    AlertTriangle,
    LifeBuoy,
    Calendar,
    Trophy,
    XCircle,
    PiggyBank,
    RefreshCw,
    CheckCircle,
    ChevronDown,
    CheckSquare,
    Square,
    History as HistoryIcon,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
} from 'lucide-react';
import type { MasaPlan, EventDetail, Rule } from '../types/masaniello';
// This part needs careful surgery.
// First, adding import:
import { getEarlyClosureSuggestion, checkValueBet } from '../utils/masaLogic';

// Then fixing the JSX block around line 382/385.
// The previous edit inserted a </div> and then an expression.
// We need to remove the extra </div> and place the expression correctly.


interface ActivePlanProps {
    initialCapital: number;
    currentPlan: MasaPlan;
    isSequenceActive: boolean;
    sequence: EventDetail[];
    activeRules: string[];
    rules: Rule[];
    toggleRule: (id: string) => void;
    getRuleStatus: (id: string) => { active: boolean; enabled: boolean; isSuspended?: boolean };
    onFullBet: (isWin: boolean, customQuota?: number) => void;
    onPartialStep: (isWin: boolean, customQuota?: number) => void;
    onBreakEven: () => void;
    onAdjustment: (amount: number, isWinEquivalent: boolean) => void;
    onActivateRescue: (events: number, target?: number, wins?: number, extraCap?: number) => void;
    onEarlyClose: () => void;
    getNextStake: (quota?: number) => number;
    getRescueSuggestion: (extraCap?: number) => {
        eventsToAdd: number;
        winsToAdd: number;
        targetCapital: number;
        suggestedExtraCapital?: number;
        estimatedStake: number;
    } | null;
}

const ActivePlan: React.FC<ActivePlanProps> = ({
    initialCapital,
    currentPlan,
    isSequenceActive,
    sequence,
    activeRules,
    rules,
    toggleRule,
    getRuleStatus,
    onFullBet,
    onPartialStep,
    onBreakEven,
    onAdjustment,
    onActivateRescue,
    onEarlyClose,
    getNextStake,
    getRescueSuggestion,
}) => {
    const [rescueEventsToAdd, setRescueEventsToAdd] = useState(2);
    const [rulesExpanded, setRulesExpanded] = useState(false);
    const [currentQuota, setCurrentQuota] = useState<number>(currentPlan.quota);
    const [extraCap, setExtraCap] = useState(0);

    const suggestion = getRescueSuggestion(extraCap);
    const earlyClosure = getEarlyClosureSuggestion(currentPlan);

    const eventsPlayed = currentPlan.totalEvents - currentPlan.remainingEvents;
    const structuralWins = currentPlan.expectedWins - currentPlan.remainingWins;
    const structuralLosses = currentPlan.totalEvents - currentPlan.expectedWins - (currentPlan.remainingEvents - currentPlan.remainingWins);
    const totalAllowedErrors = currentPlan.totalEvents - currentPlan.expectedWins;
    const remainingAllowedErrors = totalAllowedErrors - structuralLosses;
    const tiltThreshold = Math.max(2, Math.ceil(remainingAllowedErrors * 0.3));
    const isCritical = structuralLosses >= totalAllowedErrors * 0.8 && totalAllowedErrors > 0;
    const isRescueNeededAfterWins = currentPlan.isRescued && currentPlan.remainingWins === 0 && currentPlan.currentCapital < currentPlan.startCapital - 0.01;

    const partialBtnAmount = isSequenceActive ? sequence[0].stake : getNextStake(currentQuota) / 2;
    const displayStake = isSequenceActive ? sequence[0].stake : getNextStake(currentQuota);

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none" />

            {earlyClosure?.shouldClose && (
                <div className="relative mb-6 -mx-6 -mt-6 bg-gradient-to-r from-emerald-600 to-green-700 text-white p-5 rounded-t-xl shadow-lg border-b border-emerald-500/30 animate-in slide-in-from-top-2">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md shrink-0">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <div className="font-extrabold text-lg tracking-tight uppercase flex items-center gap-2">
                                    Take Profit Intelligente <span className="bg-white/20 text-xs px-2 py-0.5 rounded font-bold">ALGORITMO</span>
                                </div>
                                <div className="text-xs text-emerald-100/90 leading-relaxed max-w-lg font-medium">
                                    {earlyClosure.reason}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onEarlyClose}
                            className="bg-white text-emerald-800 hover:bg-emerald-50 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                        >
                            <CheckCircle size={16} /> Chiudi Ciclo & Massimizza (€{earlyClosure.profitSecure.toFixed(2)})
                        </button>
                    </div>
                </div>
            )}

            {currentPlan.currentConsecutiveLosses && currentPlan.currentConsecutiveLosses >= tiltThreshold && !currentPlan.isRescued && (
                <div className="relative mb-6 -mx-6 -mt-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 rounded-t-xl shadow-lg border-b border-indigo-500/30 animate-in slide-in-from-top-2">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-md shrink-0 border border-indigo-500/30">
                                <ShieldAlert size={24} className="text-indigo-300" />
                            </div>
                            <div className="space-y-1">
                                <div className="font-extrabold text-lg tracking-tight uppercase flex items-center gap-2 text-indigo-100">
                                    Anti-Tilt Protection <span className="bg-indigo-500/30 text-[10px] px-2 py-0.5 rounded font-bold border border-indigo-400/30">STREAK NEGATIVA</span>
                                </div>
                                <div className="text-xs text-indigo-200/80 leading-relaxed max-w-lg font-medium">
                                    Rilevati {currentPlan.currentConsecutiveLosses} loss consecutivi. L'algoritmo suggerisce di attivare la "Modalità Difensiva": estendi il piano di 1 evento per abbassare drasticamente la prossima puntata e recuperare lucidità.
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => onActivateRescue(1, currentPlan.targetCapital, 0, 0)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50 transition-all hover:scale-105 active:scale-95 whitespace-nowrap border border-indigo-400/20"
                        >
                            <LifeBuoy size={16} /> Abbassa Stake (Safety +1)
                        </button>
                    </div>
                </div>
            )}

            {isCritical && !currentPlan.isRescued && (
                <div className="relative mb-6 -mx-6 -mt-6 bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 rounded-t-xl shadow-lg border-b border-red-500/30 animate-in slide-in-from-top-2">
                    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md shrink-0">
                                <AlertTriangle size={24} className="text-yellow-300" />
                            </div>
                            <div className="space-y-1">
                                <div className="font-extrabold text-lg tracking-tight uppercase">Soglia Critica / Rescue 2.0</div>
                                <div className="text-xs text-red-100/90 leading-relaxed max-w-md">
                                    Il sistema ha rilevato un rischio elevato. Puoi estendere la durata del piano o accettare il suggerimento algoritmico per tornare in break-even.
                                </div>
                            </div>
                        </div>

                        {suggestion ? (
                            <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-400/30 flex flex-col gap-2 min-w-[320px] shadow-2xl backdrop-blur-sm">
                                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-black text-blue-300">
                                    <span className="flex items-center gap-1"><LifeBuoy size={12} /> Suggerimento Salvatore G. 2.0</span>
                                    <span className="bg-yellow-400 text-blue-900 px-1.5 py-0.5 rounded">CONSIGLIATO</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 py-1">
                                    <div className="bg-slate-900/40 p-3 rounded-lg flex flex-col items-center">
                                        <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Extra Capitale (€)</div>
                                        <input
                                            type="number"
                                            className="w-20 bg-slate-800 border-none text-center font-bold text-white text-xs focus:ring-0"
                                            value={extraCap}
                                            onChange={(e) => setExtraCap(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="bg-slate-900/40 p-3 rounded-lg flex flex-col items-center">
                                        <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Nuovi Eventi</div>
                                        <div className="text-sm font-black text-white">+{suggestion?.eventsToAdd}</div>
                                    </div>
                                    <div className="bg-slate-900/40 p-3 rounded-lg flex flex-col items-center">
                                        <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Vittorie</div>
                                        <div className="text-sm font-black text-white">+{suggestion?.winsToAdd}</div>
                                    </div>
                                    <div className="bg-slate-900/40 p-3 rounded-lg flex flex-col items-center">
                                        <div className="text-[9px] uppercase font-bold text-slate-400 mb-1 text-green-400">Puntata</div>
                                        <div className="text-sm font-black text-green-400">€{suggestion?.estimatedStake.toFixed(2)}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onActivateRescue(suggestion.eventsToAdd, suggestion.targetCapital, suggestion.winsToAdd, extraCap)}
                                    className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 group"
                                >
                                    APPLICA RECOVERY (BE)
                                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-black/20 p-3 rounded-lg border border-white/10 flex flex-col gap-2 min-w-[280px]">
                                <div className="flex justify-between items-center text-xs uppercase tracking-wider font-semibold opacity-80">
                                    <span>Target Attuale</span>
                                    <span>€{currentPlan.targetCapital.toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-white/10 my-1"></div>
                                <div className="flex gap-2 items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase opacity-60">Step:</span>
                                        <select
                                            value={rescueEventsToAdd}
                                            onChange={(e) => setRescueEventsToAdd(Number(e.target.value))}
                                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-md px-2 py-1 text-xs font-bold outline-none cursor-pointer transition-colors"
                                        >
                                            {[1, 2, 3, 4, 5, 8, 10].map((v) => (
                                                <option key={v} value={v} className="bg-slate-800 text-white">
                                                    +{v} Eventi
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => onActivateRescue(rescueEventsToAdd)}
                                        className="bg-yellow-400 hover:bg-yellow-300 text-red-900 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-yellow-400/20 transition-all hover:scale-105"
                                    >
                                        <LifeBuoy size={16} /> Attiva
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isRescueNeededAfterWins && (
                <div className="relative mb-6 -mx-6 -mt-6 bg-gradient-to-r from-orange-600 to-amber-700 text-white p-5 rounded-t-xl shadow-lg border-b border-orange-500/30 animate-in slide-in-from-top-2">
                    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                <AlertTriangle size={24} className="text-yellow-300" />
                            </div>
                            <div>
                                <div className="font-extrabold text-lg tracking-tight uppercase">Vittorie Esaurite - Recupero Incompleto</div>
                                <div className="text-sm text-orange-100/90 leading-tight">
                                    Il Masa ha completato le vittorie previsto ma sei ancora in perdita. Estendi il piano per continuare il recupero.
                                </div>
                            </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg border border-white/10 flex flex-col gap-2 min-w-[280px]">
                            <div className="flex gap-2 items-center justify-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase opacity-60">Stake: €0.00</span>
                                </div>
                                <button
                                    onClick={() => onActivateRescue(suggestion?.eventsToAdd || 2, suggestion?.targetCapital, suggestion?.winsToAdd || 1, extraCap)}
                                    className="bg-white text-orange-800 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                                >
                                    <LifeBuoy size={16} /> Estendi Recupero (+{suggestion?.winsToAdd || 1}V)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentPlan.isRescued && (
                <div className="absolute top-4 right-4 bg-orange-500/10 border border-orange-500/50 text-orange-400 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 animate-pulse z-20">
                    <LifeBuoy size={14} /> Salvagente Attivo
                </div>
            )}

            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-3 tracking-tighter">
                        PIANO ATTIVO
                        {currentPlan.isRescued && (
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-2 py-0.5 tracking-tighter font-bold">
                                RESCUED
                            </span>
                        )}
                    </h2>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Gestione Masa attiva</div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-xs px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700/50 font-bold text-blue-400 flex items-center gap-2">
                        <Calendar size={14} /> {currentPlan.totalEvents}E / {currentPlan.expectedWins}V
                    </div>
                    <div className={`text-xs px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700/50 font-bold ${currentPlan.currentCapital < currentPlan.startCapital ? 'text-orange-400' : 'text-green-400'} flex items-center gap-2`}>
                        <CheckCircle size={14} /> Target: €{currentPlan.targetCapital.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10">
                {/* Capital Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PiggyBank size={48} className="text-white" />
                    </div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <PiggyBank size={14} className="text-blue-400" /> Capitale Attuale
                        </span>
                        {currentPlan.currentCapital >= initialCapital ? (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                <TrendingUp size={10} /> +{(currentPlan.currentCapital - initialCapital).toFixed(2)}€
                            </span>
                        ) : (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-black flex items-center gap-1">
                                <TrendingDown size={10} /> {(currentPlan.currentCapital - initialCapital).toFixed(2)}€
                            </span>
                        )}
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight mb-1">
                        €{currentPlan.currentCapital.toFixed(2)}
                    </div>
                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-700"
                            style={{ width: `${Math.min(100, (currentPlan.currentCapital / currentPlan.targetCapital) * 100)}%` }}
                        />
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase text-right mt-1">
                        Target: €{currentPlan.targetCapital.toFixed(2)}
                    </div>
                </div>

                {/* Progress Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Events Progress */}
                    <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={14} className="text-blue-400" /> Eventi
                            </span>
                            <span className="text-xs font-black text-white">{eventsPlayed}/{currentPlan.totalEvents}</span>
                        </div>
                        <div className="mt-3 relative z-10">
                            <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)] transition-all duration-700"
                                    style={{ width: `${(eventsPlayed / currentPlan.totalEvents) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Wins Progress */}
                    <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-green-500/5 opacity-0 hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Trophy size={14} className="text-green-400" /> Vittorie
                            </span>
                            <span className="text-xs font-black text-white">{structuralWins}/{currentPlan.expectedWins}</span>
                        </div>
                        <div className="mt-3 relative z-10">
                            <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-700"
                                    style={{ width: `${(structuralWins / currentPlan.expectedWins) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Errors Margin */}
                    <div className={`col-span-2 bg-slate-800/50 border ${isCritical ? 'border-red-500/40 bg-red-500/5' : 'border-slate-700/30'} rounded-xl p-3 flex items-center justify-between relative overflow-hidden transition-colors duration-500`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-700/50 text-slate-400'}`}>
                                <XCircle size={16} />
                            </div>
                            <div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Margine Errori</div>
                                <div className={`text-xs font-black ${isCritical ? 'text-red-400' : 'text-slate-300'}`}>
                                    {structuralLosses} commessi <span className="text-slate-600 font-normal">/</span> {totalAllowedErrors} totali
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            {Array.from({ length: totalAllowedErrors }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-6 rounded-full transition-all duration-500 ${idx < structuralLosses ? 'bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-slate-700/30'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {currentPlan.maxConsecutiveLosses && currentPlan.maxConsecutiveLosses > 0 ? (
                <div className="col-span-2 md:col-span-4 bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/10 rounded-xl p-3 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-orange-900/20 text-orange-400 group-hover:scale-110 transition-transform ${currentPlan.currentConsecutiveLosses && currentPlan.currentConsecutiveLosses > 0 ? 'animate-pulse' : ''}`}>
                            <AlertTriangle size={16} />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Condizione: Max {currentPlan.maxConsecutiveLosses} Rossi</div>
                            <div className="text-xs font-bold text-slate-200">
                                Strike Attuale: <span className={currentPlan.currentConsecutiveLosses && currentPlan.currentConsecutiveLosses >= currentPlan.maxConsecutiveLosses ? 'text-red-500' : 'text-orange-400'}>{currentPlan.currentConsecutiveLosses || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: currentPlan.maxConsecutiveLosses }).map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2.5 h-2.5 rounded-full border ${idx < (currentPlan.currentConsecutiveLosses || 0) ? 'bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-700 border-slate-600'}`}
                            />
                        ))}
                    </div>
                </div>
            ) : null}

            <div
                className={`p-4 rounded-2xl mb-5 shadow-2xl relative overflow-hidden transition-all duration-500 group ${isSequenceActive ? 'bg-gradient-to-br from-indigo-700 to-slate-900 border-2 border-indigo-500/30' : 'bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white/5'}`}
            >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex items-center justify-between">
                    <div className="text-xs text-white uppercase tracking-[0.2em] flex items-center gap-2 font-black">
                        <RefreshCw size={14} className={isSequenceActive ? 'animate-spin-slow' : ''} />
                        {isSequenceActive ? `Sequenza (Step ${sequence.length + 1}/2)` : 'Prossima Puntata'}
                    </div>
                    <div className="flex items-center gap-4">
                        {!isSequenceActive && (
                            <div className="flex flex-col items-end mr-4">
                                <label className="text-[8px] uppercase font-black text-white/50 mb-1">Quota Giocata</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={currentQuota}
                                    onChange={(e) => setCurrentQuota(Number(e.target.value))}
                                    className="bg-white/10 text-white text-sm font-bold w-16 px-2 py-1 rounded border border-white/20 outline-none focus:border-white/50 transition-colors"
                                />
                            </div>
                        )}
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-medium text-white/50">€</span>
                            <span className="text-3xl font-medium tracking-tighter text-white drop-shadow-lg">{displayStake.toFixed(2)}</span>
                            {isSequenceActive && (
                                <span className="text-[10px] bg-black/20 text-indigo-100 px-2 py-0.5 rounded-full ml-3 font-bold tracking-tight backdrop-blur-sm">
                                    Quota 50%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {isSequenceActive && (
                    <div className="relative z-10 flex gap-1.5 mt-3 pt-3 border-t border-white/10">
                        {sequence.map((step, idx) => (
                            <div
                                key={idx}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider border ${step.isWin ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-red-500/20 border-red-500/50 text-red-300'}`}
                            >
                                {step.isWin ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                {idx + 1}°: {step.isWin ? 'V' : 'P'}
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider border border-white/10 bg-white/5 text-white/30 animate-pulse">
                            2° STEP...
                        </div>
                    </div>
                )}
            </div>

            {
                (() => {
                    const valueBetStatus = checkValueBet(
                        displayStake,
                        currentQuota,
                        currentPlan.currentCapital,
                        currentPlan.remainingWins,
                        currentPlan.remainingEvents
                    );

                    if (!valueBetStatus) return null;

                    return (
                        <div className={`mb-4 px-4 py-3 rounded-lg border flex items-start gap-3 w-full ${valueBetStatus.status === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'}`}>
                            <div className={`p-1.5 rounded-full mt-0.5 shrink-0 animate-pulse ${valueBetStatus.status === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                <AlertTriangle size={16} />
                            </div>
                            <div>
                                <div className="font-bold text-sm uppercase tracking-wider mb-1 opacity-90">Attenzione: {valueBetStatus.status === 'critical' ? 'Rischio Critico' : 'Warning'}</div>
                                <div className="text-xs font-medium leading-normal opacity-80">{valueBetStatus.message}</div>
                            </div>
                        </div>
                    );
                })()
            }

            <div className="mb-6">
                <button
                    onClick={() => setRulesExpanded(!rulesExpanded)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/50 rounded-xl transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${rulesExpanded ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                            <CheckCircle size={14} />
                        </div>
                        <span className="font-bold text-xs text-slate-300">
                            Regole Automatiche Attive: <span className="text-white ml-1">{activeRules.length}</span>
                        </span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-500 group-hover:text-slate-300 transition-transform duration-300 ${rulesExpanded ? 'rotate-180' : ''}`} />
                </button>
                {rulesExpanded && (
                    <div className="mt-2 p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {rules.map((rule) => {
                                const status = getRuleStatus(rule.id);
                                return (
                                    <div
                                        key={rule.id}
                                        onClick={() => toggleRule(rule.id)}
                                        className={`px-3 py-2 rounded-lg text-[10px] flex items-center justify-between cursor-pointer border transition-all ${status.isSuspended ? 'bg-orange-500/5 border-orange-500/20 opacity-80' : status.enabled ? 'bg-slate-800 border-slate-600 text-slate-200 hover:border-slate-500 shadow-sm' : 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-40 hover:opacity-100 hover:bg-slate-900/50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`transition-all ${status.enabled ? 'scale-110 text-green-500' : 'scale-100 text-slate-700'}`}>
                                                {status.enabled ? <CheckSquare size={14} /> : <Square size={14} />}
                                            </div>
                                            <span className={`font-medium ${!status.enabled ? 'line-through opacity-50' : ''}`}>{rule.label}</span>
                                        </div>
                                        {status.isSuspended && (
                                            <span className="shrink-0 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none">SOSPESA</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                {!isSequenceActive ? (
                    <>
                        <button
                            onClick={() => onFullBet(true, currentQuota)}
                            className="group relative overflow-hidden py-4 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-green-800 active:border-b-0"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-2"><CheckCircle size={18} /> VINTA</span>
                                <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold">100% TARGET</span>
                            </div>
                        </button>
                        <button
                            onClick={() => onPartialStep(true, currentQuota)}
                            className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-slate-800 border-2 border-green-500/30 hover:border-green-500/50 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98]"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-2 text-green-400"><TrendingUp size={18} /> PARZIALE</span>
                                <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">€{partialBtnAmount.toFixed(2)} (50%)</span>
                            </div>
                        </button>
                        <button
                            onClick={() => onFullBet(false, currentQuota)}
                            className="group relative overflow-hidden py-4 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-red-900 active:border-b-0"
                        >
                            <div className="flex flex-col items-center text-white">
                                <span className="flex items-center gap-2"><XCircle size={18} /> PERSA</span>
                                <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold uppercase">Fallimento totale</span>
                            </div>
                        </button>
                        <button
                            onClick={() => onPartialStep(false, currentQuota)}
                            className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-slate-800 border-2 border-red-500/30 hover:border-red-500/50 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98]"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-1.5 text-red-500"><TrendingDown size={18} /> PARZIALE</span>
                                <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">€{partialBtnAmount.toFixed(2)} (50%)</span>
                            </div>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => onPartialStep(true)}
                            className="col-span-1 group relative overflow-hidden py-6 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-green-800 active:border-b-0"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-3"><Trophy size={24} /> 2° VINTA</span>
                                <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold">CHIUDI SEQUENZA</span>
                            </div>
                        </button>
                        <button
                            onClick={() => onPartialStep(false)}
                            className="col-span-1 group relative overflow-hidden py-6 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-red-900 active:border-b-0"
                        >
                            <div className="flex flex-col items-center text-white">
                                <span className="flex items-center gap-3"><XCircle size={24} /> 2° PERSA</span>
                                <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold uppercase">PERDE ENTRAMBI</span>
                            </div>
                        </button>
                    </>
                )}
            </div>

            <div className="mb-8 p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={48} />
                </div>
                <h3 className="text-[10px] font-black text-indigo-400 border-b border-indigo-500/20 pb-2 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <HistoryIcon size={14} className="text-indigo-500" /> Trading Dashboard (PRO)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        onClick={onBreakEven}
                        className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-[11px] font-black text-slate-300 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                    >
                        <RefreshCw size={18} className="text-slate-500" />
                        <div className="flex flex-col items-start leading-none">
                            <span>BREAK EVEN</span>
                            <span className="text-[8px] opacity-40 mt-1">€0.00 NET</span>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            const val = prompt("Inserisci il profitto NETTO realizzato (€):", "0.00");
                            if (val !== null && val !== "") onAdjustment(Number(val), Number(val) > 0);
                        }}
                        className="py-3 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-xl text-[11px] font-black text-indigo-300 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                    >
                        <TrendingUp size={18} className="text-indigo-400" />
                        <div className="flex flex-col items-start leading-none">
                            <span>PROFITTO PARZ.</span>
                            <span className="text-[8px] opacity-40 mt-1">MANUAL +€</span>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            const val = prompt("Inserisci la perdita NETTA realizzata (€):", "0.00");
                            if (val !== null && val !== "") onAdjustment(-Math.abs(Number(val)), false);
                        }}
                        className="py-3 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 rounded-xl text-[11px] font-black text-rose-300 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                    >
                        <TrendingDown size={18} className="text-rose-400" />
                        <div className="flex flex-col items-start leading-none">
                            <span>PERDITA PARZ.</span>
                            <span className="text-[8px] opacity-40 mt-1">MANUAL -€</span>
                        </div>
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <HistoryIcon size={14} /> Registro EventI ({currentPlan.events.filter((e) => !e.isSystemLog).length})
                    </h3>
                </div>
                <div className="p-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {[...currentPlan.events].reverse().map((event) => (
                        <div
                            key={event.id}
                            className={`p-3 rounded-xl flex justify-between items-center border transition-all hover:bg-slate-800/50 ${event.isSystemLog
                                ? 'bg-orange-500/5 border-orange-500/20 text-orange-200'
                                : event.isVoid
                                    ? 'bg-slate-600/5 border-slate-600/20 text-slate-400'
                                    : event.isWin
                                        ? 'bg-green-500/5 border-green-500/20 shadow-[inset_0_0_10px_rgba(34,197,94,0.05)]'
                                        : 'bg-red-500/5 border-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]'
                                }`}
                        >
                            {event.isSystemLog ? (
                                <div className="w-full flex justify-between items-center px-2">
                                    <span className="font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                                        <LifeBuoy size={14} className="text-orange-400" /> {event.message}
                                    </span>
                                    <span className="text-[10px] tabular-nums opacity-40">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${event.isWin ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
                                                }`}
                                        >
                                            {event.id}
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                                                {event.message ? (
                                                    <span className="text-blue-400 flex items-center gap-1">
                                                        {event.isVoid ? <RefreshCw size={12} /> : event.isWin ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {event.message}
                                                    </span>
                                                ) : event.isVoid ? (
                                                    <>
                                                        <AlertTriangle size={12} /> NULLO
                                                    </>
                                                ) : event.isWin ? (
                                                    <>
                                                        <CheckCircle size={12} className="text-green-500" /> Vinto
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle size={12} className="text-red-500" /> Perso
                                                    </>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                                {event.isPartialSequence && (
                                                    <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                                                        Sequenza
                                                    </span>
                                                )}
                                                <span className="font-medium">Quota: {event.quota}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-sm text-slate-200 tracking-tight">€{event.capitalAfter.toFixed(2)}</div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Residuo</div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default ActivePlan;
