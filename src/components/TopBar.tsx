import React from 'react';
import { DollarSign } from 'lucide-react';
import type { AggregatedStats } from '../types/masaniello';

interface TopBarProps {
    stats: AggregatedStats;
    poolCapital: number;
    onTogglePool: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ stats, poolCapital, onTogglePool }) => {
    return (
        <header className="topbar">
            {/* Logo */}
            <div className="topbar-logo">
                <div className="logo-mark">M</div>
                <div className="logo-text">
                    Masaniello <span>Dashboard</span>
                </div>
            </div>

            {/* KPIs */}
            <div className="topbar-kpis">
                <div className="kpi-pill">
                    <div className="kpi-label">Initial Capital</div>
                    <div className="kpi-value blue">€{stats.totalInitialCapital.toFixed(2)}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">Total Worth</div>
                    <div className="kpi-value neutral">€{stats.totalWorth.toFixed(2)}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">Total Profit</div>
                    <div className={`kpi-value ${stats.totalProfit >= 0 ? 'pos' : 'neg'}`}>
                        {stats.totalProfit >= 0 ? '+' : ''}€{stats.totalProfit.toFixed(2)}
                    </div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">Total Banked</div>
                    <div className="kpi-value gold">€{stats.totalBanked.toFixed(2)}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">Total Capital</div>
                    <div className="kpi-value accent">€{(stats.totalWorth + stats.totalBanked).toFixed(2)}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">Target Raggiunti</div>
                    <div className="kpi-value teal">{stats.totalWeeklyTargetsReached}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">Pool</div>
                    <div className="kpi-value gold">€{poolCapital.toFixed(2)}</div>
                </div>
            </div>

            {/* Actions */}
            <div className="topbar-actions">
                <div className="badge-wins">
                    <span className="dot"></span>
                    W{stats.totalWins} · L{stats.totalLosses} · {((stats.totalWins + stats.totalLosses) / 2.5).toFixed(1)} Days
                </div>
                <button className="btn btn-ghost" onClick={onTogglePool}>
                    <DollarSign size={14} />
                    Gestisci Pool
                </button>
            </div>
        </header>
    );
};

export default TopBar;
