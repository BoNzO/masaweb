import React from 'react';
import { Plus, Archive, LayoutDashboard } from 'lucide-react';
import type { MasanielloInstance } from '../types/masaniello';

interface MasanielloTabsProps {
    instances: { [id: string]: MasanielloInstance };
    activeIds: string[];
    archivedIds: string[];
    currentViewId: string;
    onSelectView: (viewId: string) => void;
    canCreateNew: boolean;
}

const MasanielloTabs: React.FC<MasanielloTabsProps> = ({
    instances,
    activeIds,
    archivedIds,
    currentViewId,
    onSelectView,
    canCreateNew
}) => {
    const activeInstances = activeIds.map(id => instances[id]).filter(Boolean);
    const archivedInstances = archivedIds.map(id => instances[id]).filter(Boolean);

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

                {/* Archived Dropdown (if any) */}
                {archivedInstances.length > 0 && (
                    <div className="relative group ml-2">
                        <button className="px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all">
                            <Archive size={16} />
                            ARCHIVIATI ({archivedInstances.length})
                        </button>

                        {/* Dropdown */}
                        <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[200px]">
                            {archivedInstances.map(instance => (
                                <button
                                    key={instance.id}
                                    onClick={() => onSelectView(instance.id)}
                                    className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                                >
                                    <div className="font-bold">{instance.name}</div>
                                    <div className="text-[10px] text-slate-500">
                                        Archiviato il {new Date(instance.archivedAt!).toLocaleDateString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasanielloTabs;
