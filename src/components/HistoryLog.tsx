import React from 'react';
import { ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';
import { generateCSV, downloadCSV } from '../utils/exportUtils';
import { Download } from 'lucide-react';

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
                                            <div key={ev.id} className="text-sm flex justify-between py-1 border-b border-slate-600/30 last:border-0">
                                                <span className={ev.isVoid ? 'text-slate-400' : ev.isWin ? 'text-green-300' : 'text-red-300'}>
                                                    #{ev.id} {ev.isVoid ? 'VOID' : ev.isWin ? 'WIN' : 'LOSS'}
                                                </span>
                                                <span>€{ev.capitalAfter.toFixed(2)}</span>
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
