import { useState } from 'react';
import { TrendingUp, PiggyBank, Activity, RefreshCw, Wallet, Clock, X } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import type { AggregatedStats } from '../types/masaniello';

interface OverviewDashboardProps {
    stats: AggregatedStats;
    onReset?: () => void;
    savedLogs?: Array<{
        id: string;
        instanceName: string;
        instanceType: 'standard' | 'differential' | 'twin';
        timestamp: string;
        plan: any;
    }>;
    onDeleteLog?: (id: string) => void;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0f1623] border border-slate-600 p-2 rounded shadow-lg text-xs">
                <p className="font-bold text-slate-200 mb-1">{payload[0].payload.name}</p>
                <p className="text-green-400">Capitale: €{Math.ceil(payload[0].value).toLocaleString('it-IT')}</p>
            </div>
        );
    }
    return null;
};

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ stats, onReset, savedLogs = [], onDeleteLog }) => {
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Dashboard Overview</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sintesi globale delle performance</p>
                </div>
                {onReset && (
                    <button
                        onClick={onReset}
                        className="group flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                    >
                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                        Reset Sistema
                    </button>
                )}
            </div>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Initial Capital Card */}
                <div className="bg-[#0f1623] p-6 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-500/20 p-3 rounded-lg">
                            <Wallet size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">INITIAL</p>
                            <p className="text-2xl font-black text-white">€{Math.ceil(stats.totalInitialCapital).toLocaleString('it-IT')}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Capitale di partenza allocato
                    </div>
                </div>

                {/* Total Profit Card */}
                <div className="bg-[#0f1623] p-6 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`${stats.totalProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} p-3 rounded-lg`}>
                            <TrendingUp size={24} className={stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">PROFIT</p>
                            <p className={`text-2xl font-black ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats.totalProfit >= 0 ? '+' : ''}€{Math.ceil(stats.totalProfit).toLocaleString('it-IT')}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Crescita: {stats.totalGrowth >= 0 ? '+' : ''}{Math.ceil(stats.totalGrowth)}%
                    </div>
                </div>

                {/* Total Banked Card */}
                <div className="bg-[#0f1623] p-6 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-yellow-500/20 p-3 rounded-lg">
                            <PiggyBank size={24} className="text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">BANKED</p>
                            <p className="text-2xl font-black text-yellow-400">€{Math.ceil(stats.totalBanked).toLocaleString('it-IT')}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Capitale accantonato
                    </div>
                </div>

                {/* Total Capital Card */}
                <div className="bg-[#0f1623] p-6 rounded-lg border border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="bg-blue-500/20 p-3 rounded-lg">
                            <Wallet size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">TOTAL</p>
                            <p className="text-2xl font-black text-white">€{Math.ceil(stats.totalWorth).toLocaleString('it-IT')}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 relative z-10">
                        Worth + Banked
                    </div>
                </div>

                {/* Day Counter Card */}
                <div className="bg-[#0f1623] p-6 rounded-lg border border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="bg-indigo-500/20 p-3 rounded-lg">
                            <Clock size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">DAY</p>
                            <p className="text-3xl font-black text-indigo-400">{stats.totalDays}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 relative z-10">
                        W{stats.totalWins} · L{stats.totalLosses} · {stats.totalDays} Days
                    </div>
                </div>

                {/* Targets Raggiunti Card */}
                <div className="bg-[#0f1623] p-6 rounded-lg border border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="bg-teal-500/20 p-3 rounded-lg">
                            <PiggyBank size={24} className="text-teal-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">TARGET</p>
                            <p className="text-3xl font-black text-teal-400">{stats.totalWeeklyTargetsReached}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 relative z-10">
                        Cicli settimanali completati
                    </div>
                </div>
            </div>

            {/* Combined Capital Chart */}
            <div className="bg-[#0f1623] p-6 rounded-lg border border-slate-700 shadow-lg">
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-400" />
                    Storico Capitale Aggregato
                </h3>

                <div className="h-[400px]">
                    {stats.combinedChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.combinedChartData}>
                                <defs>
                                    <linearGradient id="colorCapitalAgg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="days"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    tickFormatter={(value) => `${value.toFixed(0)}g`}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    domain={['auto', 'auto']}
                                    tickFormatter={(value) => `€${value}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="capital"
                                    stroke="#4ade80"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCapitalAgg)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            <div className="text-center">
                                <Activity size={48} className="mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Nessun dato disponibile</p>
                                <p className="text-xs">Crea un Masaniello per iniziare</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0f1623] p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Eventi Totali</p>
                    <p className="text-3xl font-black text-white">{stats.totalWins + stats.totalLosses}</p>
                </div>

                <div className="bg-[#0f1623] p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Vittorie</p>
                    <p className="text-3xl font-black text-green-400">{stats.totalWins}</p>
                </div>

                <div className="bg-[#0f1623] p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Perdite</p>
                    <p className="text-3xl font-black text-red-400">{stats.totalLosses}</p>
                </div>
            </div>

            {/* SAVED LOGS ARCHIVE */}
            <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <Clock size={20} className="text-indigo-400" />
                            Archivio Diario di Trading
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sintesi di tutti i cicli salvati permanentemente</p>
                    </div>
                </div>

                {savedLogs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {savedLogs.map((log) => {
                            const profit = log.plan.currentCapital - log.plan.startCapital;
                            const isWin = profit >= 0;
                            const isExpanded = expandedLogId === log.id;

                            return (
                                <div key={log.id} className="bg-[#0f1623] rounded-xl border border-slate-700 overflow-hidden transition-all hover:border-slate-500">
                                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWin ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {isWin ? <TrendingUp size={20} /> : <Activity size={20} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-white uppercase tracking-tight">{log.instanceName}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md border border-slate-700 font-bold uppercase">{log.instanceType}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                                                    {new Date(log.timestamp).toLocaleString('it-IT')} · {log.plan.wins}W / {log.plan.losses}L
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className={`text-md font-black ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                {isWin ? '+' : ''}€{Math.ceil(profit).toLocaleString('it-IT')}
                                            </div>
                                            <div className="text-[9px] text-slate-500 font-bold uppercase">ROI: {((profit / log.plan.startCapital) * 100).toFixed(1)}%</div>
                                        </div>

                                        <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                                            <button
                                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase rounded-lg transition-all"
                                            >
                                                {isExpanded ? 'Chiudi' : 'Dettagli'}
                                            </button>
                                            {onDeleteLog && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Eliminare permanentemente questo log?')) {
                                                            onDeleteLog(log.id);
                                                        }
                                                    }}
                                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/20 transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-6 pt-2 bg-black/20 border-t border-slate-700 animate-in slide-in-from-top-2">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <div className="p-3 bg-white/5 rounded-lg">
                                                        <div className="text-[9px] text-slate-500 font-bold uppercase">Capitale Iniziale</div>
                                                        <div className="text-sm text-white font-black">€{Math.ceil(log.plan.startCapital)}</div>
                                                    </div>
                                                    <div className="p-3 bg-white/5 rounded-lg">
                                                        <div className="text-[9px] text-slate-500 font-bold uppercase">Capitale Finale</div>
                                                        <div className="text-sm text-white font-black">€{Math.ceil(log.plan.currentCapital)}</div>
                                                    </div>
                                                    <div className="p-3 bg-white/5 rounded-lg">
                                                        <div className="text-[9px] text-slate-500 font-bold uppercase">Quota Media</div>
                                                        <div className="text-sm text-white font-black">@{log.plan.quota?.toFixed(2)}</div>
                                                    </div>
                                                    <div className="p-3 bg-white/5 rounded-lg">
                                                        <div className="text-[9px] text-slate-500 font-bold uppercase">Status</div>
                                                        <div className="text-sm text-indigo-400 font-black uppercase">{log.plan.status}</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-1">Sequenza Eventi & Analisi</p>
                                                    {(log.plan.events || [])
                                                        .filter((e: any) => !e.isSystemLog)
                                                        .map((ev: any, idx: number) => (
                                                            <div key={idx} className="bg-white/[0.03] border border-white/5 p-3 rounded-lg flex flex-col gap-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${ev.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                            {ev.isWin ? 'W' : 'L'}
                                                                        </div>
                                                                        <span className="text-xs text-slate-300 font-bold">€{Math.ceil(ev.stake)} @{ev.quota?.toFixed(2)}</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-slate-500 font-medium font-mono">{new Date(ev.timestamp).toLocaleString('it-IT')}</span>
                                                                </div>
                                                                {ev.note && (
                                                                    <div className="text-[10px] text-slate-400 italic bg-black/20 p-2 rounded border-l-2 border-indigo-500/30">
                                                                        {ev.note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-[#0f1623] p-12 rounded-xl border border-slate-700 border-dashed text-center">
                        <Clock size={40} className="mx-auto text-slate-600 mb-3 opacity-20" />
                        <p className="text-sm text-slate-500">Nessun log salvato nell'archivio.</p>
                        <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold">I cicli archiviati appariranno qui automaticamente.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverviewDashboard;
