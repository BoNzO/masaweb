import React from 'react';
import { PiggyBank, Trophy, XCircle, Hash, Calendar, Coins } from 'lucide-react';

interface StatsOverviewProps {
    totalWorth: number;
    startCapital: number;
    absoluteStartCapital: number;
    totalProfit: number;
    totalGrowth: number;
    totalBanked: number;
    totalWins: number;
    totalLosses: number;
    estimatedDays: number;
    expectedWinsTotal: number;
    evPerformance: number;
    onUpdateAbsoluteStartCapital: (newAmount: number) => void;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
    totalWorth,
    startCapital,
    absoluteStartCapital,
    totalProfit,
    totalGrowth,
    totalBanked,
    totalWins,
    totalLosses,
    estimatedDays,
    expectedWinsTotal,
    evPerformance,
    onUpdateAbsoluteStartCapital,
}) => {
    const [isEditingStart, setIsEditingStart] = React.useState(false);
    const [tempStart, setTempStart] = React.useState(absoluteStartCapital.toString());

    const handleUpdate = () => {
        const val = parseFloat(tempStart);
        if (!isNaN(val) && val > 0) {
            onUpdateAbsoluteStartCapital(val);
            setIsEditingStart(false);
        }
    };
    return (
        <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">
                        Capitale Corrente (+ Accantonato)
                    </div>
                    <div className="text-3xl font-medium text-green-400 flex items-baseline gap-2">
                        €{totalWorth.toFixed(2)}
                        <span className="text-sm text-slate-500 font-medium">/ €{startCapital.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 uppercase tracking-tighter font-bold group/cap">
                        Su Cap. Iniziale:
                        {isEditingStart ? (
                            <div className="flex items-center gap-1 ml-1">
                                <span className="text-slate-400">€</span>
                                <input
                                    type="number"
                                    value={tempStart}
                                    onChange={(e) => setTempStart(e.target.value)}
                                    className="w-20 bg-slate-900 text-white font-bold text-xs px-1 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                                />
                                <button onClick={handleUpdate} className="text-emerald-400 hover:bg-emerald-500/10 p-0.5 rounded"><XCircle size={14} className="rotate-45" /></button> {/* Using XCircle rotated as Check/Plus or just use simple text/icon if available. Let's use Check icon if imported, but XCircle is imported. I'll stick to a simple text or reuse XCircle for cancel? Wait, I need a check icon. XCircle is imported. I'll add Check/CheckCircle to imports or just use text. Let's import CheckCircle in next step if needed. For now using text 'OK' or existing icons. Let's use XCircle for cancel and click outside to save? No, explicit save. */}
                                <button onClick={() => setIsEditingStart(false)} className="text-rose-400 hover:bg-rose-500/10 p-0.5 rounded"><XCircle size={14} /></button>
                            </div>

                        ) : (
                            <span
                                className="text-slate-400 font-medium cursor-pointer hover:text-blue-400 transition-colors border-b border-transparent hover:border-blue-400 dashed"
                                onClick={() => { setTempStart(absoluteStartCapital.toString()); setIsEditingStart(true); }}
                                title="Clicca per modificare il capitale iniziale storico"
                            >
                                €{absoluteStartCapital.toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>



                <div className="w-px h-12 bg-slate-700 hidden md:block"></div>

                <div className="flex-1 md:text-right">
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">
                        Profitto Totale (+Accantonato)
                    </div>
                    <div className={`text-3xl font-medium ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalProfit >= 0 ? '+' : ''}€{totalProfit.toFixed(2)}
                    </div>
                    <div className="flex flex-col md:items-end mt-1">
                        <div className={`text-xs font-medium ${totalGrowth >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                            {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-1 flex flex-wrap md:justify-end gap-x-2">
                            <span>Netto: <span className="text-slate-300">€{(totalProfit - totalBanked).toFixed(2)}</span></span>
                            <span className="opacity-30">|</span>
                            <span>Banked: <span className="text-yellow-500/80">€{totalBanked.toFixed(2)}</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg relative overflow-hidden">
                <div className="flex flex-col h-full justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                                    <PiggyBank size={14} className="text-yellow-500" /> Accantonato
                                </div>
                                <div className="text-2xl font-bold text-yellow-500">€{totalBanked.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-400 text-xs uppercase font-black mb-1">EV Analysis</div>
                                <div className={`text-xl font-bold ${evPerformance >= 1 ? 'text-blue-400' : 'text-orange-400'}`}>
                                    {evPerformance.toFixed(2)}x
                                </div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">
                                    Wins: {totalWins} / EV: {expectedWinsTotal.toFixed(1)}
                                </div>
                            </div>
                        </div>

                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full transition-all duration-1000 ${evPerformance >= 1 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-orange-500'}`}
                                style={{ width: `${Math.min(100, evPerformance * 50)}%` }} // 1.0 = 50% marker
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                            <Trophy size={14} className="text-green-500" />
                            <span>{totalWins} V</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                            <XCircle size={14} className="text-red-500" />
                            <span>{totalLosses} P</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                            <Hash size={14} className="text-blue-400" />
                            <span>{totalWins + totalLosses} T</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
                            <Calendar size={14} className="text-slate-500" />
                            <span>{estimatedDays} GG</span>
                        </div>
                    </div>
                </div>
                <Coins className="absolute top-2 right-2 text-yellow-500/10 w-16 h-16 pointer-events-none" />
            </div>
        </div >
    );
};

export default StatsOverview;
