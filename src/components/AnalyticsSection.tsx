import React from 'react';
import { TrendingUp, Target } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import type { ChartDataPoint } from '../types/masaniello';

interface AnalyticsSectionProps {
    chartData: ChartDataPoint[];
    heatmapData: any[]; // Specific heatmap structure
    weeklyTarget: number;
    weeklyTargetPercentage: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs">
                <p className="font-bold text-slate-200 mb-1">{payload[0].payload.name}</p>
                <p className="text-slate-400">Giorno: {payload[0].payload.days}</p>
                <p className="text-green-400">Capitale: €{payload[0].value.toFixed(2)}</p>
            </div>
        );
    }
    return null;
};

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ chartData, heatmapData, weeklyTarget, weeklyTargetPercentage }) => {
    return (
        <div className="grid grid-cols-1 gap-6">
            <div className={`bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg h-[300px] flex flex-col ${chartData.length <= 1 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-400" /> Storico Capitale
                </h3>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="days" stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(value) => `${value}g`} />
                            <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="capital" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorCapital)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[300px]">
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <Target size={16} className="text-green-400" /> Target Weekly €{weeklyTarget.toFixed(2)} ({weeklyTargetPercentage}%)
                </h3>
                <div className="flex gap-4 flex-1 min-h-0 items-center">
                    <div className="flex flex-col justify-between h-[150px] text-[10px] text-slate-500 py-1">
                        <span>100%</span>
                        <span>80%</span>
                        <span>60%</span>
                        <span>40%</span>
                        <span>20%</span>
                    </div>
                    <div className="flex-1 h-[150px]">
                        <div className="grid grid-cols-12 gap-1 h-full">
                            {heatmapData.map((week, i) => (
                                <div key={i} className="flex flex-col justify-between h-full group">
                                    <div className="flex flex-col h-full gap-0.5">
                                        {week.data.map((level: any, levelIdx: number) => (
                                            <div
                                                key={levelIdx}
                                                className={`flex-1 rounded-sm transition-all duration-500 ${level.data === 1 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-white/5'}`}
                                                title={`${week.key} - ${level.key}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-slate-500 text-center mt-1 group-hover:text-slate-300 transition-colors">S{i + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsSection;
