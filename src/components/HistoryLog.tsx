import React from 'react';
import { ChevronDown, ChevronUp, LifeBuoy, Download, Clock } from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';
import { generateCSV, downloadCSV } from '../utils/exportUtils';

interface HistoryLogProps {
    history: MasaPlan[];
    expandedHistory: number | null;
    setExpandedHistory: (id: number | null) => void;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ history, expandedHistory, setExpandedHistory }) => {
    if (history.length === 0) return null;

    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Storico ({history.length})</h2>
            <div className="space-y-3">
                {[...history].reverse().map((plan) => {
                    const profit = plan.currentCapital - plan.startCapital;
                    const isExpanded = expandedHistory === plan.id;
                    return (
                        <div key={plan.id} className="bg-slate-700 rounded-lg overflow-hidden">
                            <div
                                onClick={() => setExpandedHistory(isExpanded ? null : plan.id)}
                                className="p-4 cursor-pointer hover:bg-slate-600/50 flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        Gen. {plan.generationNumber + 1} {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        {plan.isRescued && <LifeBuoy size={14} className="text-orange-400" />}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {plan.wins}V / {plan.losses}L • {Math.ceil((plan.wins + plan.losses) / 2.5)} GG
                                    </div>
                                    <div className="text-xs text-slate-300 bg-slate-800/50 px-2 py-1 rounded inline-block">
                                        €{plan.startCapital.toFixed(2)} → €{plan.currentCapital.toFixed(2)}
                                        {plan.accumulatedAmount > 0 && <span className="text-yellow-400 ml-2">(Bank: €{plan.accumulatedAmount})</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{profit >= 0 ? '+' : ''}€{profit.toFixed(2)}</div>
                                    <div className="text-xs text-slate-400">{plan.triggeredRule || plan.status}</div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const csv = generateCSV(plan);
                                            downloadCSV(csv, `masa_log_${plan.id}.csv`);
                                        }}
                                        className="mt-1 flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-900 border border-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
                                    >
                                        <Download size={10} /> CSV
                                    </button>
                                </div>
                            </div>
                            {isExpanded && plan.events && (
                                <div className="px-4 pb-4 border-t border-slate-600 bg-slate-700/50 mt-2 pt-2">
                                    {plan.events
                                        .filter((e) => !e.isSystemLog)
                                        .map((ev) => (
                                            <div key={ev.id} className="py-2 border-b border-slate-600/30 last:border-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-black text-[10px] w-6 h-6 rounded flex items-center justify-center ${ev.isVoid ? 'bg-slate-800 text-slate-500' : ev.isWin ? 'bg-green-500 text-green-950' : 'bg-red-500 text-white'}`}>
                                                            {ev.isWin ? 'W' : ev.isVoid ? 'V' : 'L'}
                                                        </span>
                                                        <div className="flex flex-col">
                                                            <div className="text-xs font-bold text-slate-200">
                                                                {ev.pair || '—'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                <Clock size={8} /> {ev.nyTimestamp || ev.timestamp?.slice(11, 16) || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-black text-slate-100">€{ev.capitalAfter.toFixed(2)}</div>
                                                        <div className="text-[9px] text-slate-500">Stake: €{ev.stake.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                                {ev.checklistResults && Object.keys(ev.checklistResults).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1 pl-8">
                                                        {Object.entries(ev.checklistResults).map(([task, checked]) => (
                                                            <div key={task} className={`text-[8px] px-1.5 py-0.5 rounded border ${checked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/10 text-rose-500 opacity-50'}`}>
                                                                {checked ? '✓' : '✗'} {task}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HistoryLog;
