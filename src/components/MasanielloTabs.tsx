import React from 'react';
import { Plus, LayoutDashboard } from 'lucide-react';
import type { MasanielloInstance } from '../types/masaniello';

interface MasanielloTabsProps {
    instances: { [id: string]: MasanielloInstance };
    activeIds: string[];
    currentViewId: string;
    onSelectView: (viewId: string) => void;
    canCreateNew: boolean;
}

const MasanielloTabs: React.FC<MasanielloTabsProps> = ({
    instances,
    activeIds,
    currentViewId,
    onSelectView,
    canCreateNew
}) => {
    const activeInstances = activeIds.map(id => instances[id]).filter(Boolean);


    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {/* Overview Tab */}
                <button
                    onClick={() => onSelectView('overview')}
                    className={`px-4 py-2.5 rounded-lg font-bold text-xs flex flex-col items-start gap-1 transition-all min-w-[140px] ${currentViewId === 'overview'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <LayoutDashboard size={14} />
                        <span>OVERVIEW</span>
                    </div>
                    <div className="text-[10px] opacity-70">
                        Aggregato
                    </div>
                </button>

                {/* Active Masaniello Tabs */}
                {activeInstances.map(instance => {
                    const currentCapital = instance.currentPlan?.currentCapital || instance.absoluteStartCapital;
                    const banked = instance.history.reduce((sum, plan) => sum + (plan.accumulatedAmount || 0), 0);
                    const profit = (currentCapital + banked) - instance.absoluteStartCapital;
                    const isProfit = profit >= 0;

                    return (
                        <button
                            key={instance.id}
                            onClick={() => onSelectView(instance.id)}
                            className={`px-4 py-2.5 rounded-lg font-bold text-xs flex flex-col items-start gap-1 transition-all min-w-[140px] ${currentViewId === instance.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span>{instance.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                                <span className={isProfit ? 'text-green-300' : 'text-red-300'}>
                                    {isProfit ? '+' : ''}€{profit.toFixed(0)}
                                </span>
                                {banked > 0 && (
                                    <span className="text-yellow-300">
                                        🏦 €{banked.toFixed(0)}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}

                {/* New Masaniello Tab (+ button) */}
                {canCreateNew && (
                    <button
                        onClick={() => onSelectView('new')}
                        className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${currentViewId === 'new'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border-2 border-dashed border-slate-600'
                            }`}
                    >
                        <Plus size={16} />
                        NUOVO
                    </button>
                )}


            </div>
        </div>
    );
};

export default MasanielloTabs;
