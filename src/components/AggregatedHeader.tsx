import React from 'react';
import { PiggyBank, DollarSign, Activity } from 'lucide-react';
import type { AggregatedStats } from '../types/masaniello';

interface AggregatedHeaderProps {
    stats: AggregatedStats;
    poolCapital: number;
}

const AggregatedHeader: React.FC<AggregatedHeaderProps> = ({ stats, poolCapital }) => {
    return (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-4 mb-6 shadow-2xl">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity size={14} className="text-blue-400" />
                Riepilogo Multi-Masaniello
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Total Capital */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={14} className="text-blue-400" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Total Capital</span>
                    </div>
                    <p className="text-xl font-black text-white">
                        €{(stats.totalWorth + stats.totalBanked).toFixed(2)}
                    </p>
                </div>

                {/* Total Worth */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-green-400" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Total Worth</span>
                    </div>
                    <p className="text-xl font-black text-white">
                        €{stats.totalWorth.toFixed(2)}
                    </p>
                </div>

                {/* Total Banked */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                        <PiggyBank size={14} className="text-yellow-400" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Total Banked</span>
                    </div>
                    <p className="text-xl font-black text-yellow-400">
                        €{stats.totalBanked.toFixed(2)}
                    </p>
                </div>

                {/* Targets Raggiunti */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-teal-500/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-teal-400" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Targets</span>
                    </div>
                    <p className="text-xl font-black text-teal-400">
                        {stats.totalWeeklyTargetsReached}
                    </p>
                </div>

                {/* Pool Capital */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-yellow-700/50">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={14} className="text-yellow-400" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Pool</span>
                    </div>
                    <p className="text-xl font-black text-yellow-400">
                        €{poolCapital.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Performance Detail Row */}
            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Profitto:</span>
                        <span className={`font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.totalProfit >= 0 ? '+' : ''}€{stats.totalProfit.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Crescita:</span>
                        <span className={`font-bold ${stats.totalGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.totalGrowth >= 0 ? '+' : ''}{stats.totalGrowth.toFixed(2)}%
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500">
                    <span className="text-green-500/80">{stats.totalWins} Vittorie</span>
                    <span className="opacity-30">|</span>
                    <span className="text-red-500/80">{stats.totalLosses} Perdite</span>
                </div>
            </div>
        </div>
    );
};

export default AggregatedHeader;
