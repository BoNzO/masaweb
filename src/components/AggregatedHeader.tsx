import React from 'react';
import { TrendingUp, PiggyBank, DollarSign, Activity } from 'lucide-react';
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
                {/* Total Worth */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={14} className="text-green-400" />
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

                {/* Total Profit */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className={stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Total Profit</span>
                    </div>
                    <p className={`text-xl font-black ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.totalProfit >= 0 ? '+' : ''}€{stats.totalProfit.toFixed(2)}
                    </p>
                </div>

                {/* Growth */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className={stats.totalGrowth >= 0 ? 'text-green-400' : 'text-red-400'} />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Growth</span>
                    </div>
                    <p className={`text-xl font-black ${stats.totalGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.totalGrowth >= 0 ? '+' : ''}{stats.totalGrowth.toFixed(2)}%
                    </p>
                </div>

                {/* Pool Capital */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-blue-700/50">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={14} className="text-blue-400" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Pool Disponibile</span>
                    </div>
                    <p className="text-xl font-black text-blue-400">
                        €{poolCapital.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Win/Loss Stats */}
            <div className="mt-3 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400">Vittorie:</span>
                    <span className="font-bold text-green-400">{stats.totalWins}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400">Perdite:</span>
                    <span className="font-bold text-red-400">{stats.totalLosses}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400">Win Rate:</span>
                    <span className="font-bold text-white">
                        {stats.totalWins + stats.totalLosses > 0
                            ? ((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)
                            : 0}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AggregatedHeader;
