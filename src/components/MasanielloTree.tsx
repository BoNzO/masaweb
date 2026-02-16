import React, { useMemo } from 'react';
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Network
} from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';
import { roundTwo } from '../utils/mathUtils';

interface MasanielloTreeProps {
    plans: Record<string, MasaPlan>;
    activePlanId: string | null;
    onSelectPlan: (planId: string) => void;
}

interface TreeNode {
    plan: MasaPlan;
    children: TreeNode[];
}

const MasanielloTree: React.FC<MasanielloTreeProps> = ({ plans, activePlanId, onSelectPlan }) => {

    // Build Tree Structure
    const rootNodes = useMemo(() => {
        if (!plans || Object.keys(plans).length === 0) return [];

        // 1. Map all nodes
        const nodeMap: Record<string, TreeNode> = {};
        Object.values(plans).forEach(plan => {
            nodeMap[plan.id] = { plan, children: [] };
        });

        // 2. Link children to parents
        const roots: TreeNode[] = [];
        Object.values(plans).forEach(plan => {
            if (plan.parentId && nodeMap[plan.parentId]) {
                nodeMap[plan.parentId].children.push(nodeMap[plan.id]);
            } else {
                roots.push(nodeMap[plan.id]);
            }
        });

        // Sort roots (e.g. by creation date)
        return roots.sort((a, b) => new Date(a.plan.createdAt).getTime() - new Date(b.plan.createdAt).getTime());
    }, [plans]);

    const renderNode = (node: TreeNode, depth: number) => {
        const { plan } = node;
        const isActive = String(plan.id) === String(activePlanId);
        const profit = plan.currentCapital - plan.startCapital;
        const isPositive = profit >= 0;
        const isCompleted = plan.status === 'completed' || plan.status.includes('close');
        const isFailed = plan.status === 'failed' || plan.status.includes('stop');

        let statusColor = 'border-slate-700 bg-slate-800/80';
        let statusIcon = <RefreshCw size={14} className="text-slate-400" />;

        if (isActive) {
            statusColor = 'border-indigo-500 bg-indigo-900/30 ring-2 ring-indigo-500/50 shadow-indigo-500/20 shadow-lg';
            statusIcon = <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />;
        } else if (isCompleted) {
            statusColor = 'border-emerald-600/50 bg-emerald-900/20';
            statusIcon = <CheckCircle size={14} className="text-emerald-500" />;
        } else if (isFailed) {
            statusColor = 'border-rose-600/50 bg-rose-900/20';
            statusIcon = <AlertTriangle size={14} className="text-rose-500" />;
        }

        const progress = plan.totalEvents > 0 ? ((plan.totalEvents - plan.remainingEvents) / plan.totalEvents) * 100 : 0;

        return (
            <div key={plan.id} className="flex flex-col items-center relative group">
                {/* Node Card */}
                <div
                    onClick={() => onSelectPlan(String(plan.id))}
                    className={`
                        relative w-48 p-4 rounded-xl border transition-all duration-300 cursor-pointer backdrop-blur-sm
                        ${statusColor}
                        hover:scale-105 hover:shadow-xl hover:border-indigo-400/50
                        mb-8 z-10
                    `}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                            <Network size={10} /> Gen {plan.generationNumber + 1}
                        </div>
                        {statusIcon}
                    </div>

                    {/* Capital */}
                    <div className="text-xl font-black text-white mb-1 tracking-tight">
                        €{roundTwo(plan.currentCapital).toFixed(2)}
                    </div>

                    {/* Profit/Loss */}
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isPositive ? '+' : ''}€{roundTwo(profit).toFixed(2)} ({roundTwo((profit / plan.startCapital) * 100).toFixed(1)}%)
                    </div>

                    {/* Minimal Progress Bar */}
                    <div className="w-full bg-slate-900/50 h-1.5 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Active Indicator Dot */}
                    {isActive && (
                        <div className="absolute -right-1 -top-1 w-3 h-3 bg-indigo-400 rounded-full border-2 border-slate-900 animate-ping" />
                    )}
                </div>

                {/* Vertical Line from Node to Children container */}
                {node.children.length > 0 && (
                    <div className="w-px h-8 bg-slate-600 absolute bottom-0 translate-y-full" />
                )}

                {/* Render Children */}
                {node.children.length > 0 && (
                    <div className="flex gap-8 items-start relative pt-8 mt-0">
                        {/* Horizontal Connector Line: visible only if more than 1 child */}
                        {node.children.length > 1 && (
                            <div className="absolute top-0 left-[20%] right-[20%] h-px bg-slate-600" />
                        )}

                        {/* Vertical connectors for each child are implicit via the parent structure in a manual tree, 
                            but for CSS tree, we often need a wrapper. Here we use Flexbox which aligns them. 
                            We need lines connecting up to the parent's vertical line.
                        */}

                        {node.children.map((child) => (
                            <div key={child.plan.id} className="relative flex flex-col items-center">
                                {/* Vertical line going UP to the horizontal connector */}
                                <div className="absolute -top-8 left-1/2 w-px h-8 bg-slate-600 -translate-x-1/2" />
                                {renderNode(child, depth + 1)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full overflow-auto custom-scrollbar p-12 bg-slate-900/30 rounded-3xl border border-white/5 flex flex-col items-center min-h-[600px]">
            {rootNodes.length === 0 ? (
                <div className="text-center text-slate-500 py-20 animate-pulse">
                    <Network size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold">Nessun piano presente nell'albero.</p>
                </div>
            ) : (
                <div className="flex justify-center items-start gap-16 scale-90 origin-top">
                    {rootNodes.map(root => renderNode(root, 0))}
                </div>
            )}
        </div>
    );
};

export default MasanielloTree;
