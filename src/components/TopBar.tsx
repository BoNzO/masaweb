import React from 'react';
import { DollarSign, RotateCcw } from 'lucide-react';
import type { AggregatedStats } from '../types/masaniello';

interface TopBarProps {
    stats: AggregatedStats;
    poolCapital: number;
    onTogglePool: () => void;
    onResetGlobalStats: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ stats, poolCapital, onTogglePool, onResetGlobalStats }) => {
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
                    <div className="kpi-label">INITIAL</div>
                    <div className="kpi-value" style={{ color: '#3b82f6' }}>€{Math.ceil(stats.totalInitialCapital).toLocaleString('it-IT')}</div>
                </div>

                <div className="kpi-pill">
                    <div className="kpi-label">BANKED</div>
                    <div className="kpi-value gold">€{Math.ceil(stats.totalBanked).toLocaleString('it-IT')}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">PROFIT</div>
                    <div className={`kpi-value ${stats.totalProfit >= 0 ? 'pos' : 'neg'}`}>
                        {stats.totalProfit >= 0 ? '+' : ''}€{Math.ceil(stats.totalProfit).toLocaleString('it-IT')}
                    </div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">TOTAL</div>
                    <div className="kpi-value" style={{ color: '#3b82f6' }}>€{Math.ceil(stats.totalWorth).toLocaleString('it-IT')}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">TARGET</div>
                    <div className="kpi-value teal">{stats.totalWeeklyTargetsReached}</div>
                </div>
                <div className="kpi-pill">
                    <div className="kpi-label">POOL</div>
                    <div className="kpi-value gold">€{Math.ceil(poolCapital).toLocaleString('it-IT')}</div>
                </div>
            </div>

            {/* Actions */}
            <div className="topbar-actions">
                <div className="badge-wins" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="dot"></span>
                    W{stats.totalWins} · L{stats.totalLosses} · {stats.totalDays} Days
                    <button
                        onClick={() => {
                            if (window.confirm("Vuoi azzerare le statistiche globali (Win, Loss, Days)?")) {
                                onResetGlobalStats();
                            }
                        }}
                        className="text-emerald-500/80 hover:text-emerald-400 p-0 cursor-pointer transition-colors"
                        title="Azzera Statistiche Globali"
                        style={{ background: 'transparent', border: 'none', marginLeft: '4px', display: 'flex', alignItems: 'center' }}
                    >
                        <RotateCcw size={12} />
                    </button>
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
