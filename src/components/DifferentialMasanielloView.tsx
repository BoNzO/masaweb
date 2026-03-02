import React, { useEffect, useRef, useState } from 'react';
import type { MasanielloInstance } from '../types/masaniello';
import { useMasaniello } from '../hooks/useMasaniello';
import { calculateStake } from '../utils/masaLogic';
import { TrendingUp, Scale, Save } from 'lucide-react';

interface DifferentialMasanielloViewProps {
    instance: MasanielloInstance;
    onUpdate: (updates: Partial<MasanielloInstance>) => void;
    onSaveLog?: (plan: any) => void;
}

const DifferentialMasanielloView: React.FC<DifferentialMasanielloViewProps> = ({ instance, onUpdate, onSaveLog }) => {
    const diffState = instance.differentialState;

    const masaA = useMasaniello(false);
    const masaB = useMasaniello(false);

    const isInternalUpdating = useRef(false);
    const [pendingDiffUpdate, setPendingDiffUpdate] = useState<{
        realProfit: number;
        newHistoryEntry: any;
    } | null>(null);
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!diffState || isInternalUpdating.current) return;

        // Sync A
        masaA.setConfig(instance.config);
        masaA.setPlans({ [diffState.planA.id]: diffState.planA });
        masaA.setActivePlanId(String(diffState.planA.id));

        // Sync B
        masaB.setConfig(instance.config);
        masaB.setPlans({ [diffState.planB.id]: diffState.planB });
        masaB.setActivePlanId(String(diffState.planB.id));
    }, [instance]);

    useEffect(() => {
        if (!diffState) return;
        const currentA = masaA.currentPlan;
        const currentB = masaB.currentPlan;

        if (currentA && currentB &&
            (JSON.stringify(currentA) !== JSON.stringify(diffState.planA) ||
                JSON.stringify(currentB) !== JSON.stringify(diffState.planB))) {

            isInternalUpdating.current = true;

            // Check for equilibrium failure
            let newStatus = diffState.status;
            if (currentA.remainingEvents === 0 && currentA.remainingWins > 0 && currentB.remainingWins > 0) {
                newStatus = 'failed'; // Equilibrium
            } else if (currentA.status === 'completed' || currentA.status === 'success') {
                newStatus = 'success_a';
            } else if (currentB.status === 'completed' || currentB.status === 'success') {
                newStatus = 'success_b';
            } else if (currentA.status === 'failed' && currentB.status === 'failed') {
                newStatus = 'failed';
            }

            let updatedHistory = diffState.history ? [...diffState.history] : [];
            let updatedRealCapital = diffState.realCapital ?? instance.absoluteStartCapital;

            if (pendingDiffUpdate) {
                updatedHistory.unshift(pendingDiffUpdate.newHistoryEntry);
                updatedRealCapital += pendingDiffUpdate.realProfit;
                setPendingDiffUpdate(null);
            }

            onUpdate({
                differentialState: {
                    ...diffState,
                    planA: currentA,
                    planB: currentB,
                    status: newStatus as any,
                    history: updatedHistory,
                    realCapital: updatedRealCapital
                }
            });

            setTimeout(() => {
                isInternalUpdating.current = false;
            }, 50);
        }
    }, [masaA.currentPlan, masaB.currentPlan]);

    if (!diffState) return <div>Errore Caricamento Differenziale</div>;

    const currentA = diffState.planA;
    const currentB = diffState.planB;

    const quotaA = currentA.quota;
    const quotaB = currentB.quota;

    const m = currentA.maxConsecutiveLosses || 0;

    const stakeA = calculateStake(currentA.currentCapital, currentA.remainingEvents, currentA.remainingWins, quotaA, currentA.targetCapital, m, currentA.currentConsecutiveLosses || 0);
    const stakeB = calculateStake(currentB.currentCapital, currentB.remainingEvents, currentB.remainingWins, quotaB, currentB.targetCapital, m, currentB.currentConsecutiveLosses || 0);

    const stakeDiff = Math.abs(stakeA - stakeB);
    const direction = stakeA > stakeB ? 'LONG' : (stakeB > stakeA ? 'SHORT' : 'NEUTRAL');

    const currentRealCapital = diffState.realCapital ?? instance.absoluteStartCapital;

    const handleOutcome = (outcome: 'WIN_A' | 'WIN_B' | 'LOSS_BOTH') => {
        if (diffState.status !== 'active') return;

        let realProfit = 0;
        if (direction === 'LONG' && outcome === 'WIN_A') {
            realProfit = stakeDiff * (quotaA - 1);
        } else if (direction === 'LONG' && outcome !== 'WIN_A') {
            realProfit = -stakeDiff;
        } else if (direction === 'SHORT' && outcome === 'WIN_B') {
            realProfit = stakeDiff * (quotaB - 1);
        } else if (direction === 'SHORT' && outcome !== 'WIN_B') {
            realProfit = -stakeDiff;
        }

        const newHistoryEntry = {
            id: Date.now().toString(),
            stakeA,
            stakeB,
            stakeDiff,
            direction,
            outcome,
            netProfit: realProfit,
            realCapitalAfter: currentRealCapital + realProfit,
            note,
            timestamp: new Date().toISOString()
        };

        setPendingDiffUpdate({ realProfit, newHistoryEntry });

        if (outcome === 'WIN_A') {
            masaA.handleFullBet(true, quotaA, undefined, undefined, 0, false, false, note);
            masaB.handleFullBet(false, quotaB, undefined, undefined, 0, false, false, note);
        } else if (outcome === 'WIN_B') {
            masaA.handleFullBet(false, quotaA, undefined, undefined, 0, false, false, note);
            masaB.handleFullBet(true, quotaB, undefined, undefined, 0, false, false, note);
        } else if (outcome === 'LOSS_BOTH') {
            masaA.handleFullBet(false, quotaA, undefined, undefined, 0, false, false, note);
            masaB.handleFullBet(false, quotaB, undefined, undefined, 0, false, false, note);
        }
        setNote('');
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in" style={{ gridColumn: '1 / -1' }}>

            {diffState.status !== 'active' && (
                <div className="bg-gradient-to-r from-emerald-900 to-green-900 text-white p-6 rounded-xl shadow-2xl flex flex-col items-center justify-between gap-6">
                    <h3 className="text-xl font-bold uppercase">Ciclo Concluso: {diffState.status.replace('_', ' ').toUpperCase()}</h3>
                </div>
            )}

            {/* Differential Master Card */}
            <div className={`p-8 rounded-3xl relative overflow-hidden transition-all duration-500 shadow-2xl border ${direction === 'LONG' ? 'bg-gradient-to-br from-[#0f1623] to-[#142838] border-blue-500/30' :
                direction === 'SHORT' ? 'bg-gradient-to-br from-[#0f1623] to-[#281438] border-purple-500/30' :
                    'bg-gradient-to-br from-[#0f1623] to-[#181c21] border-white/5'
                }`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50"></div>

                <div className="flex items-center justify-between mb-8 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/5 text-white rounded-xl backdrop-blur-md">
                            <Scale size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest">Master Differenziale</h2>
                            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-1">Ottimizzazione Capitale</p>
                        </div>
                    </div>

                    {/* Total Capital - Center */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                        <div className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-1">Capitale Totale</div>
                        <div className="text-3xl font-black text-emerald-400">
                            €{Math.ceil(currentRealCapital).toLocaleString('it-IT')}
                        </div>
                    </div>

                    {/* Status badges - Right */}
                    <div className="flex flex-col items-end gap-2">
                        {onSaveLog && diffState && (
                            <button
                                onClick={() => {
                                    onSaveLog(diffState.planA);
                                    alert('Sessione Differenziale salvata nel Diario!');
                                }}
                                className="group flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-lg border border-indigo-500/20 transition-all active:scale-95"
                            >
                                <Save size={12} className="group-hover:scale-110 transition-transform" />
                                Salva Diario
                            </button>
                        )}
                        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white tracking-widest uppercase">
                            Chiusi: {instance.history?.length || 0}
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white tracking-widest uppercase">
                            {currentA.totalEvents - currentA.remainingEvents} / {currentA.totalEvents} Eventi
                        </div>
                        {/* Mobile Total Capital Fallback */}
                        <div className="md:hidden px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 tracking-widest uppercase">
                            Cap. Totale: €{Math.ceil(currentRealCapital).toLocaleString('it-IT')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* MASA A */}
                    <div className="flex flex-col p-6 rounded-2xl bg-black/20 border border-white/5">
                        <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-4">Punta / Long</div>
                        <div className="text-3xl font-black text-white mb-2">€{Math.ceil(stakeA).toLocaleString('it-IT')}</div>
                        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/5 pt-3 mt-2">
                            <span>Quota <strong>{quotaA.toFixed(2)}</strong></span>
                            <span>Capitale: €{Math.ceil(currentA.currentCapital).toLocaleString('it-IT')}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-2">Target: {currentA.remainingWins}W su {currentA.remainingEvents}</div>
                    </div>

                    {/* DIFFERENTIAL */}
                    <div className="flex flex-col items-center justify-center p-6 relative">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 animate-pulse">Stake da Piazzare</div>

                        <div className="text-5xl md:text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter">
                            €{Math.ceil(stakeDiff).toLocaleString('it-IT')}
                        </div>

                        {direction !== 'NEUTRAL' && (
                            <div className={`mt-4 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest border ${direction === 'LONG' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                }`}>
                                Direzione: ESITO {direction}
                            </div>
                        )}
                        {direction === 'NEUTRAL' && (
                            <div className="mt-4 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700">
                                NETTO ZERO (NO BET)
                            </div>
                        )}
                    </div>

                    {/* MASA B */}
                    <div className="flex flex-col p-6 rounded-2xl bg-black/20 border border-white/5">
                        <div className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-4">Banca / Short</div>
                        <div className="text-3xl font-black text-white mb-2">€{Math.ceil(stakeB).toLocaleString('it-IT')}</div>
                        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/5 pt-3 mt-2">
                            <span>Quota <strong>{quotaB.toFixed(2)}</strong></span>
                            <span>Capitale: €{Math.ceil(currentB.currentCapital).toLocaleString('it-IT')}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-2">Target: {currentB.remainingWins}W su {currentB.remainingEvents}</div>
                    </div>
                </div>
            </div>

            {/* ACTION CENTER */}
            <div className="bg-[#1e2329] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-sm text-white uppercase tracking-wider">Esito Evento</div>
                        <div className="text-xs text-slate-400">Aggiorna simultaneamente i due Masa in base all'esito reale.</div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Nota diario per trade differenziale..."
                        className="w-full md:w-80 min-h-[42px] bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-blue-500/30 transition-all resize-none shadow-inner"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleOutcome('WIN_A')}
                            disabled={diffState.status !== 'active'}
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/10"
                        >
                            Win LONG
                        </button>
                        <button
                            onClick={() => handleOutcome('WIN_B')}
                            disabled={diffState.status !== 'active'}
                            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/10"
                        >
                            Win SHORT
                        </button>
                        <button
                            onClick={() => handleOutcome('LOSS_BOTH')}
                            disabled={diffState.status !== 'active'}
                            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-500/10"
                        >
                            Loss
                        </button>
                    </div>
                </div>
            </div>

            {/* HISTORY PANEL */}
            {diffState.history && diffState.history.length > 0 && (
                <div className="bg-[#1e2329] rounded-2xl border border-white/5 shadow-xl overflow-hidden mt-2">
                    <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Storico Giocate Master</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-black/10">
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Event</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Direzione</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Stake Diff</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Esito</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Profitto</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Capitale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {diffState.history.map((h, i) => (
                                    <React.Fragment key={h.id}>
                                        <tr className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                            <td className="py-3 px-4 text-xs font-bold text-white">#{diffState.history!.length - i}</td>
                                            <td className="py-3 px-4 text-xs font-bold">
                                                <span className={`px-2 py-1 rounded-md ${h.direction === 'LONG' ? 'bg-blue-500/20 text-blue-400' : h.direction === 'SHORT' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                                    {h.direction}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-white">€{Math.ceil(h.stakeDiff)}</td>
                                            <td className="py-3 px-4 text-xs font-medium text-slate-300">
                                                {h.outcome === 'WIN_A' ? 'Vincente LONG' : h.outcome === 'WIN_B' ? 'Vincente SHORT' : 'Entrambi Persi'}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-right font-black">
                                                <span className={h.netProfit > 0 ? 'text-green-400' : h.netProfit < 0 ? 'text-rose-400' : 'text-slate-400'}>
                                                    {h.netProfit > 0 ? '+' : ''}€{Math.ceil(h.netProfit)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-bold text-white text-right">
                                                €{Math.ceil(h.realCapitalAfter)}
                                            </td>
                                        </tr>
                                        {h.note && (
                                            <tr className="bg-black/20 border-b border-white/5">
                                                <td colSpan={6} className="py-2 px-6 text-[10px] text-slate-500 italic">
                                                    Nota: {h.note}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DifferentialMasanielloView;
