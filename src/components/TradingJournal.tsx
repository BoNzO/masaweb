import React from 'react';
import {
    TrendingUp,
    BarChart3,
    Calendar,
    Activity,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    BookOpen,
    ShieldAlert
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Area,
} from 'recharts';
import type { PerformanceStats } from '../utils/performanceUtils';

interface TradingJournalProps {
    stats: PerformanceStats;
}

const TradingJournal: React.FC<TradingJournalProps> = ({ stats }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* PERFORMANCE OVERVIEW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Sharpe Ratio', value: stats.sharpeRatio, icon: <Activity size={18} />, color: 'text-indigo-400', desc: 'Rendimento p. unità di rischio', benchmark: `> ${stats.benchmarks.sharpeRatio}` },
                    { label: 'Max Drawdown', value: `${stats.maxDrawdown}%`, icon: <ShieldAlert size={18} />, color: 'text-rose-400', desc: 'Flessione massima dal picco', benchmark: `< ${stats.benchmarks.maxDrawdown}%` },
                    { label: 'Profit Factor', value: stats.profitFactor, icon: <TrendingUp size={18} />, color: 'text-emerald-400', desc: 'P. Lordi / Perdite Lorde', benchmark: `> ${stats.benchmarks.profitFactor}` },
                    { label: 'Win Rate', value: `${stats.winRate}%`, icon: <Target size={18} />, color: 'text-sky-400', desc: 'Perc. trade vincenti', benchmark: `> ${stats.benchmarks.winRate}%` },
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl hover:border-slate-600 transition-all group relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg bg-slate-900/50 ${stat.color} group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <div className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.value}</div>
                            <div className="text-[9px] text-slate-400 opacity-60 font-mono">/ target {stat.benchmark}</div>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1 italic leading-tight">{stat.desc}</p>
                        <div className="mt-2 py-1 px-2 rounded bg-slate-900/40 border border-slate-700/30">
                            <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter opacity-70">Benchmark: </span>
                            <span className="text-[10px] text-indigo-300/80 font-bold">{stat.benchmark}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* EQUITY CURVE */}
            <div className="bg-slate-800/80 border border-slate-700/50 p-6 rounded-3xl shadow-2xl relative overflow-hidden h-[400px] flex flex-col">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <TrendingUp size={120} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" /> Professional Equity Curve (Chronological)
                </h3>

                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.equityCurve}>
                            <defs>
                                <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis
                                dataKey="timestamp"
                                hide
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={10}
                                tickFormatter={(val) => `€${val}`}
                                domain={['auto', 'auto']}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', fontSize: '12px' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                labelFormatter={(label) => new Date(label).toLocaleString()}
                                formatter={(value: number) => [`€${value.toFixed(2)}`, 'Equity']}
                            />
                            <Area
                                type="monotone"
                                dataKey="capital"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#eqGradient)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TRADING JOURNAL TABLE */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-slate-700/50 bg-slate-800/80 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <BookOpen size={16} className="text-indigo-400" /> Master Trading Journal
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Activity size={14} /> Total Events: {stats.totalTrades}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700/50 bg-slate-900/40">
                                <th className="px-6 py-4">Data / Ora</th>
                                <th className="px-6 py-4">Stake</th>
                                <th className="px-6 py-4">Esito</th>
                                <th className="px-6 py-4">Saldo (€)</th>
                                <th className="px-6 py-4">P/L %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {[...stats.equityCurve].reverse().map((point, idx, arr) => {
                                if (point.id === 'start') return null;
                                const prevPoint = arr[idx + 1];
                                const change = prevPoint ? point.capital - prevPoint.capital : 0;
                                const percent = prevPoint && prevPoint.capital > 0 ? (change / prevPoint.capital) * 100 : 0;

                                return (
                                    <tr key={point.id} className="hover:bg-slate-700/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-300">
                                                {new Date(point.timestamp).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                {new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-mono text-slate-400">€{Math.abs(change).toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {change > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">
                                                    <ArrowUpRight size={12} /> Vincita
                                                </span>
                                            ) : change < 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase">
                                                    <ArrowDownRight size={12} /> Perdita
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-black uppercase">
                                                    BE
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-black text-slate-200">€{point.capital.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-xs font-bold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {change >= 0 ? '+' : ''}{percent.toFixed(2)}%
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {stats.equityCurve.length <= 1 && (
                    <div className="p-12 text-center">
                        <BarChart3 size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-slate-500 font-bold italic">Nessun dato disponibile nel Trading Journal</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradingJournal;
