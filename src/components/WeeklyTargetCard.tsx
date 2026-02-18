import React from 'react';
import type { MasaPlan, Config } from '../types/masaniello';

interface WeeklyTargetCardProps {
    plan: MasaPlan;
    config: Config;
    history: MasaPlan[];
}

const WeeklyTargetCard: React.FC<WeeklyTargetCardProps> = ({ plan, config, history }) => {
    const weeklyTargetPercentage = config.weeklyTargetPercentage || 0;

    // Count targets reached in history and current plan
    const historyReached = (history || []).reduce((sum, p) => sum + (p.weeklyTargetsReached || 0), 0);
    const targetsReached = historyReached + (plan.weeklyTargetsReached || 0);

    // Weekly target calculations
    // If we have a stored currentWeeklyTarget, use it. Otherwise calculate based on startCapital and percentage.
    const startCapital = plan.startWeeklyBaseline || plan.startCapital;
    const absoluteWeeklyTarget = plan.currentWeeklyTarget || (startCapital * (1 + weeklyTargetPercentage / 100));

    const currentCapital = plan.currentCapital;
    const totalToGain = absoluteWeeklyTarget - startCapital;
    const currentGain = currentCapital - startCapital;

    const progress = totalToGain > 0 ? Math.max(0, Math.min(100, (currentGain / totalToGain) * 100)) : 0;
    const missing = Math.max(0, absoluteWeeklyTarget - currentCapital);

    // SVG Circle properties
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="card-header-redesign" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--txt-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Target Settimanale
                    </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--txt-muted)', fontWeight: 600 }}>
                    +€{totalToGain.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} · {weeklyTargetPercentage}%
                </div>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
                {/* Progress Circle */}
                <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background */}
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="var(--bg-elevated)"
                            strokeWidth="8"
                        />
                        {/* Progress */}
                        <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="var(--accent-blue)"
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                    </svg>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--txt-primary)', lineHeight: 1 }}>
                            {Math.round(progress)}%
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--txt-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                            target
                        </span>
                    </div>
                </div>

                {/* Details Grid */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '11px', color: 'var(--txt-muted)', fontWeight: 500 }}>Mancante (Netto)</span>
                        <span style={{ fontSize: '13px', color: 'var(--txt-secondary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            €{missing.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '11px', color: 'var(--txt-muted)', fontWeight: 500 }}>Target (Netto)</span>
                        <span style={{ fontSize: '14px', color: 'var(--txt-primary)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                            €{totalToGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '11px', color: 'var(--txt-muted)', fontWeight: 500 }}>Ciclo</span>
                        <span style={{ fontSize: '12px', color: 'var(--accent-teal)', fontWeight: 700 }}>
                            Settimana
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--txt-muted)', fontWeight: 500 }}>Target Raggiunti</span>
                        <span style={{ fontSize: '14px', color: 'var(--accent-green)', fontWeight: 800 }}>
                            {targetsReached}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyTargetCard;
