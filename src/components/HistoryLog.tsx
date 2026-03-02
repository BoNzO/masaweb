import React from 'react';
import { ChevronDown, ChevronUp, LifeBuoy, Download, Clock, BarChart3, TrendingUp, TrendingDown, Target } from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';
import { generateCSV, downloadCSV } from '../utils/exportUtils';

interface HistoryLogProps {
    history: MasaPlan[];
    expandedHistory: number | null;
    setExpandedHistory: (id: number | null) => void;
    onSaveLog?: (plan: MasaPlan) => void;
    currentPlan?: MasaPlan;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ history, expandedHistory, setExpandedHistory, onSaveLog, currentPlan }) => {
    if (history.length === 0) return null;

    return (
        <div className="bg-[#0f1623]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl font-['DM_Mono']">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-white/[0.02] to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Archivio Cicli</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{history.length} sessioni completate</p>
                    </div>
                </div>

                {onSaveLog && currentPlan && (
                    <button
                        onClick={() => {
                            onSaveLog(currentPlan);
                            alert('Sessione salvata correttamente nel Diario!');
                        }}
                        className="group flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded-xl border border-indigo-500/20 transition-all active:scale-95"
                    >
                        <Download size={14} className="group-hover:scale-110 transition-transform" />
                        Salva Diario
                    </button>
                )}
            </div>

            <div className="divide-y divide-white/5">
                {[...history].reverse().map((plan) => {
                    const profit = plan.currentCapital - plan.startCapital;
                    const isExpanded = expandedHistory === plan.id;
                    const isWin = profit >= 0;

                    return (
                        <div key={plan.id} className={`transition-all duration-300 ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
                            <div
                                onClick={() => setExpandedHistory(isExpanded ? null : plan.id)}
                                className="px-8 py-5 cursor-pointer flex flex-wrap md:flex-nowrap items-center justify-between gap-6"
                            >
                                <div className="flex items-center gap-6 flex-1 min-w-[240px]">
                                    <div className="relative group">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isWin ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20'}`}>
                                            {isWin ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                        </div>
                                        {plan.isRescued && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black rounded-lg flex items-center justify-center shadow-lg border-2 border-[#0f1623]">
                                                <LifeBuoy size={10} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black text-xs uppercase tracking-widest">
                                                Ciclo Gen. {plan.generationNumber + 1}
                                            </span>
                                            {plan.tags?.includes('LONG') && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 uppercase tracking-tighter">Long</span>
                                            )}
                                            {plan.tags?.includes('SHORT') && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20 uppercase tracking-tighter">Short</span>
                                            )}
                                            {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            <span>{plan.wins}W / {plan.losses}L</span>
                                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                            <span>{new Date(plan.createdAt).toLocaleDateString('it-IT')}</span>
                                        </div>
                                    </div>

                                    <div className="hidden lg:flex items-center gap-4 px-6 border-l border-white/5">
                                        <div className="text-center">
                                            <div className="text-[9px] text-slate-500 font-black uppercase mb-0.5">Start</div>
                                            <div className="text-xs text-slate-300 font-bold">€{Math.ceil(plan.startCapital)}</div>
                                        </div>
                                        <ArrowRight size={10} className="text-slate-700" />
                                        <div className="text-center">
                                            <div className="text-[9px] text-slate-500 font-black uppercase mb-0.5">End</div>
                                            <div className="text-xs text-slate-300 font-bold">€{Math.ceil(plan.currentCapital)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right space-y-0.5">
                                        <div className={`text-lg font-black tracking-tight ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isWin ? '+' : ''}€{Math.ceil(profit).toLocaleString('it-IT')}
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                            {plan.triggeredRule || plan.status}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const csv = generateCSV(plan);
                                            downloadCSV(csv, `masa_log_${plan.id}.csv`);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all group"
                                        title="Scarica Report CSV"
                                    >
                                        <Download size={18} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                                    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="grid grid-cols-4 px-6 py-3 bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                            <div className="col-span-1">Evento</div>
                                            <div className="text-center">Quota</div>
                                            <div className="text-center">Stake</div>
                                            <div className="text-right">Bilancio</div>
                                        </div>
                                        <div className="divide-y divide-white/[0.03]">
                                            {plan.events
                                                .filter(e => !e.isSystemLog)
                                                .map((ev, idx) => (
                                                    <div key={ev.id || idx} className="grid grid-cols-4 px-6 py-4 items-center group hover:bg-white/[0.01] transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${ev.isVoid ? 'bg-slate-800 text-slate-400' : ev.isWin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                                {ev.isWin ? 'W' : ev.isVoid ? 'V' : 'L'}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-white font-bold">{ev.pair || 'TRADE #' + ev.id}</div>
                                                                <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase">
                                                                    <Clock size={8} /> {ev.nyTimestamp || ev.timestamp?.slice(11, 16) || '—'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-center text-xs text-slate-400 font-bold">
                                                            @{ev.quota?.toFixed(2) || '—'}
                                                        </div>
                                                        <div className="text-center text-xs text-slate-300 font-bold">
                                                            €{Math.ceil(ev.stake)}
                                                        </div>
                                                        <div className="text-right space-y-0.5">
                                                            <div className="text-xs text-white font-bold">€{Math.ceil(ev.capitalAfter)}</div>
                                                            <div className={`text-[8px] font-black ${ev.isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {ev.isWin ? '+' : '-'}{ev.isWin ? Math.ceil(ev.stake * ((ev.quota || 1) - 1)) : Math.ceil(ev.stake)}€
                                                            </div>
                                                        </div>
                                                        {ev.note && (
                                                            <div className="col-span-4 mt-2 px-3 py-2 bg-white/[0.02] rounded-lg border border-white/5 text-[10px] text-slate-400 italic font-medium leading-relaxed">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 not-italic mr-2">Analisi:</span>
                                                                {ev.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {plan.events.some(e => e.isSystemLog) && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {plan.events.filter(e => e.isSystemLog).map((sys, idx) => (
                                                <div key={idx} className="px-3 py-1.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex items-center gap-2 text-[9px] text-indigo-300 uppercase font-bold tracking-widest">
                                                    <Target size={10} /> {sys.message}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
);

export default HistoryLog;

