import { TrendingUp, PiggyBank, Activity, RefreshCw, Wallet } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import type { AggregatedStats } from '../types/masaniello';

interface OverviewDashboardProps {
    stats: AggregatedStats;
    onReset?: () => void;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs">
                <p className="font-bold text-slate-200 mb-1">{payload[0].payload.name}</p>
                <p className="text-green-400">Capitale: €{payload[0].value.toFixed(2)}</p>
            </div>
        );
    }
    return null;
};

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ stats, onReset }) => {

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
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-500/20 p-3 rounded-lg">
                            <Wallet size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Initial Capital</p>
                            <p className="text-2xl font-black text-white">€{stats.totalInitialCapital.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Capitale di partenza allocato
                    </div>
                </div>
                {/* Total Worth Card */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-green-500/20 p-3 rounded-lg">
                            <Activity size={24} className="text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Total Worth</p>
                            <p className="text-2xl font-black text-white">€{stats.totalWorth.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Capitale attivo + Banked
                    </div>
                </div>

                {/* Total Profit Card */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`${stats.totalProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} p-3 rounded-lg`}>
                            <TrendingUp size={24} className={stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Total Profit</p>
                            <p className={`text-2xl font-black ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats.totalProfit >= 0 ? '+' : ''}€{stats.totalProfit.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Crescita: {stats.totalGrowth >= 0 ? '+' : ''}{stats.totalGrowth.toFixed(2)}%
                    </div>
                </div>

                {/* Total Banked Card */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-yellow-500/20 p-3 rounded-lg">
                            <PiggyBank size={24} className="text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Total Banked</p>
                            <p className="text-2xl font-black text-yellow-400">€{stats.totalBanked.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Capitale accantonato
                    </div>
                </div>

                {/* Total Capital Card */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="bg-blue-500/20 p-3 rounded-lg">
                            <Wallet size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Total Capital</p>
                            <p className="text-2xl font-black text-white">€{(stats.totalWorth + stats.totalBanked).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 relative z-10">
                        Worth + Banked
                    </div>
                </div>

                {/* Targets Raggiunti Card */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="bg-teal-500/20 p-3 rounded-lg">
                            <PiggyBank size={24} className="text-teal-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Target Raggiunti</p>
                            <p className="text-3xl font-black text-teal-400">{stats.totalWeeklyTargetsReached}</p>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 relative z-10">
                        Cicli settimanali completati
                    </div>
                </div>
            </div>

            {/* Combined Capital Chart */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
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
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Eventi Totali</p>
                    <p className="text-3xl font-black text-white">{stats.totalWins + stats.totalLosses}</p>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Vittorie</p>
                    <p className="text-3xl font-black text-green-400">{stats.totalWins}</p>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">Perdite</p>
                    <p className="text-3xl font-black text-red-400">{stats.totalLosses}</p>
                </div>
            </div>
        </div>
    );
};

export default OverviewDashboard;
