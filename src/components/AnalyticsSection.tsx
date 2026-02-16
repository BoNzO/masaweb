import React from 'react';
import { TrendingUp, Target } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import type { ChartDataPoint } from '../types/masaniello';

interface AnalyticsSectionProps {
    chartData: ChartDataPoint[];
    heatmapData: any[]; // Specific heatmap structure
    weeklyTarget: number;
    weeklyTargetPercentage: number;
    currentCapital: number;
    startCapital: number;
    absoluteWeeklyTarget: number;
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

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ chartData, heatmapData, weeklyTarget, weeklyTargetPercentage, currentCapital, startCapital, absoluteWeeklyTarget }) => {
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

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[300px] relative">
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                    <Target size={16} className="text-blue-400" /> Target Weekly €{weeklyTarget.toFixed(2)} ({weeklyTargetPercentage}%)
                </h3>

                <div className="flex-1 flex flex-col items-center justify-center">
                    {/* Current Week Radial Progress */}
                    {(() => {
                        // CALCOLO RELATIVO AL PROFITTO SETTIMANALE:
                        // Se sono a 1000 e il target è 1250, il progresso è 0% finché non supero 1000.
                        const totalToGain = absoluteWeeklyTarget - startCapital;
                        const currentGain = currentCapital - startCapital;
                        const progress = Math.max(0, Math.min(100, (currentGain / totalToGain) * 100));

                        const completedWeeks = heatmapData.filter(w => w.percentage >= 99.9).length;

                        return (
                            <div className="relative flex flex-col items-center">
                                {/* SVG Radial Gauge */}
                                <div className="relative w-40 h-40">
                                    <svg className="w-full h-full -rotate-90">
                                        {/* Background Circle */}
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            className="stroke-slate-700 fill-none"
                                            strokeWidth="8"
                                        />
                                        {/* Progress Circle with Glow */}
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            className="stroke-blue-500 fill-none transition-all duration-1000 ease-out"
                                            strokeWidth="8"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * progress) / 100}
                                            strokeLinecap="round"
                                            style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' }}
                                        />
                                    </svg>

                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white">{Math.round(progress)}%</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            €{(absoluteWeeklyTarget - currentCapital).toFixed(2)} mancanti
                                        </span>
                                    </div>
                                </div>

                                {/* Milestone Steps (Minimalist) */}
                                <div className="flex gap-1.5 mt-6">
                                    {heatmapData.map((week, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-1.5 rounded-full transition-all duration-500 ${week.percentage >= 99.9
                                                ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                                                : i === completedWeeks
                                                    ? 'bg-slate-500 animate-pulse'
                                                    : 'bg-slate-700'
                                                }`}
                                            title={`Level ${i + 1}: ${Math.round(week.percentage)}%`}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Background Decorative Element */}
                <Target className="absolute -bottom-6 -right-6 text-blue-500/5 w-32 h-32 pointer-events-none" />
            </div>
        </div>
    );
};

export default AnalyticsSection;
