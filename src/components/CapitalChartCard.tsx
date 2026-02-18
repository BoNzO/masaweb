import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';

interface CapitalChartCardProps {
    history: MasaPlan[];
    currentPlan?: MasaPlan;
}

const CapitalChartCard: React.FC<CapitalChartCardProps> = ({ history, currentPlan }) => {
    // Combine history and current plan
    const allPlans = [...history];
    if (currentPlan) allPlans.push(currentPlan);

    // Simple visualization - can be replaced with a real chart library later
    const maxCapital = Math.max(...allPlans.map(p => p.currentCapital), 100);
    const minCapital = Math.min(...allPlans.map(p => p.currentCapital), 0);
    const range = maxCapital - minCapital || 100;

    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="card-header-redesign">
                <h3 className="card-title-redesign">Andamento Capitale</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--txt-muted)' }}>
                    <TrendingUp size={14} />
                    {allPlans.length} generazioni
                </div>
            </div>

            <div className="card-body-redesign">
                {allPlans.length > 0 ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '4px',
                        height: '180px',
                        padding: '20px 0'
                    }}>
                        {allPlans.map((plan, idx) => {
                            const height = ((plan.currentCapital - minCapital) / range) * 100;
                            const isProfit = plan.currentCapital >= (plan.startCapital || 0);
                            const isCurrent = idx === allPlans.length - 1 && currentPlan;

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        height: `${Math.max(height, 5)}%`,
                                        background: isCurrent
                                            ? 'linear-gradient(180deg, var(--accent-blue), var(--accent-teal))'
                                            : isProfit
                                                ? 'linear-gradient(180deg, var(--accent-green), rgba(34,197,94,0.3))'
                                                : 'linear-gradient(180deg, var(--accent-red), rgba(239,68,68,0.3))',
                                        borderRadius: '4px 4px 0 0',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-base)',
                                        opacity: isCurrent ? 1 : 0.7
                                    }}
                                    title={`Gen ${plan.generationNumber}: €${plan.currentCapital.toFixed(2)}`}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => !isCurrent && (e.currentTarget.style.opacity = '0.7')}
                                >
                                    {isCurrent && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--accent-blue)',
                                            boxShadow: '0 0 8px var(--accent-blue)',
                                            animation: 'pulse 2s infinite'
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: 'var(--txt-muted)',
                        fontSize: '13px'
                    }}>
                        Nessun dato disponibile
                    </div>
                )}

                {/* Legend */}
                {allPlans.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border)',
                        fontSize: '11px'
                    }}>
                        <div>
                            <span style={{ color: 'var(--txt-muted)' }}>Min: </span>
                            <span className="font-mono" style={{ color: 'var(--txt-primary)', fontWeight: 600 }}>
                                €{minCapital.toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--txt-muted)' }}>Max: </span>
                            <span className="font-mono" style={{ color: 'var(--txt-primary)', fontWeight: 600 }}>
                                €{maxCapital.toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span style={{ color: 'var(--txt-muted)' }}>Corrente: </span>
                            <span className="font-mono" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                                €{currentPlan?.currentCapital.toFixed(2) || '0.00'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CapitalChartCard;
