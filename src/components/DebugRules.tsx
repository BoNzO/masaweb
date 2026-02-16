import React from 'react';
import type { MasaPlan } from '../types/masaniello';
import { roundTwo } from '../utils/mathUtils';

interface DebugRulesProps {
    plan: MasaPlan;
    activeRules: string[];
    config: any;
}

const DebugRules: React.FC<DebugRulesProps> = ({ plan, activeRules, config }) => {
    const [isVisible, setIsVisible] = React.useState(false);

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 right-4 z-50 bg-black/80 text-green-400 text-xs px-3 py-2 rounded-full border border-green-500 hover:bg-black font-mono"
            >
                🐞 DEBUG
            </button>
        );
    }

    // Calculate values exactly as they are in checkPlanStatus
    // Target is now an ABSOLUTE CAPITAL VALUE (e.g. 1200)
    const absoluteTarget = plan.currentWeeklyTarget ?? (plan.startCapital * (1 + config.weeklyTargetPercentage / 100));
    const isAutoBankTriggered = activeRules.includes('auto_bank_100') && plan.currentCapital >= absoluteTarget - 0.01;

    const totalWorth = plan.currentCapital; // Simplified for this view, doesn't need history
    const currentMilestone = Math.floor(totalWorth / config.initialCapital);
    const isMilestoneTriggered = activeRules.includes('profit_milestone') && currentMilestone > (plan.profitMilestoneReached || 0) && currentMilestone > 1;

    return (
        <div className="p-4 bg-black/80 text-xs font-mono text-green-400 fixed bottom-0 right-0 z-50 border-t-2 border-green-500 w-full max-h-64 overflow-auto">
            <div className="flex justify-between items-center border-b border-green-700 mb-2 pb-2">
                <h3 className="font-bold">DEBUG: Banking Rules</h3>
                <button onClick={() => setIsVisible(false)} className="text-red-400 hover:text-red-300 font-bold px-2">
                    [NASCONDI]
                </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <strong className="text-white">Auto Bank 100 (Weekly)</strong>
                    <div>Active: {activeRules.includes('auto_bank_100') ? 'YES' : 'NO'}</div>
                    <div>Start Capital: {plan.startCapital}</div>
                    <div>Current Capital: {plan.currentCapital}</div>
                    <div>Profit: {roundTwo(plan.currentCapital - plan.startCapital)}</div>
                    <div>Target %: {config.weeklyTargetPercentage}%</div>
                    <div>Persisted Target? {plan.currentWeeklyTarget ? 'YES' : 'NO'}</div>
                    <div className="font-bold text-yellow-500">Target Total: {roundTwo(absoluteTarget)}</div>
                    <div className={isAutoBankTriggered ? "text-red-500 font-bold" : "text-gray-500"}>
                        TRIGGER: {isAutoBankTriggered ? 'TRUE' : 'FALSE'}
                    </div>
                </div>
                <div>
                    <strong className="text-white">Profit Milestone</strong>
                    <div>Active: {activeRules.includes('profit_milestone') ? 'YES' : 'NO'}</div>
                    <div>Initial Cap: {config.initialCapital}</div>
                    <div>Total Worth (Approx): {roundTwo(totalWorth)}</div>
                    <div>Current Milestone: {currentMilestone}x</div>
                    <div>High Water Mark: {plan.profitMilestoneReached || 0}x</div>
                    <div className={isMilestoneTriggered ? "text-red-500 font-bold" : "text-gray-500"}>
                        TRIGGER: {isMilestoneTriggered ? 'TRUE' : 'FALSE'}
                    </div>
                </div>
            </div>
            <div className="mt-2 pt-2 border-t border-green-900 text-gray-500">
                Active Rules: {activeRules.join(', ')}
            </div>
        </div>
    );
};

export default DebugRules;
