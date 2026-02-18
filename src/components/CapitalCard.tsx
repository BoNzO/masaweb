import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';

interface CapitalCardProps {
    plan: MasaPlan;
    bankedAmount?: number;
}

const CapitalCard: React.FC<CapitalCardProps> = ({ plan, bankedAmount = 0 }) => {
    const profit = plan.currentCapital - plan.startCapital;
    const isProfit = profit >= 0;
    const totalProfit = profit + bankedAmount;
    const growthPercent = plan.startCapital > 0 ? (profit / plan.startCapital) * 100 : 0;

    return (
        <div className="card-redesign animate-fade-up">
            {/* Main Capital Display */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0,
                padding: '22px'
            }}>
                {/* Left: Current Capital */}
                <div>
                    <div className="stat-label-redesign" style={{ marginBottom: '8px' }}>
                        Capitale Corrente
                    </div>
                    <div className="font-mono" style={{
                        fontSize: '38px',
                        fontWeight: 300,
                        letterSpacing: '-1px',
                        lineHeight: 1,
                        color: 'var(--txt-primary)'
                    }}>
                        <span style={{
                            fontSize: '20px',
                            verticalAlign: 'top',
                            marginTop: '8px',
                            display: 'inline-block',
                            color: 'var(--txt-secondary)'
                        }}>
                            €
                        </span>
                        {plan.currentCapital.toFixed(2)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--txt-muted)', marginTop: '8px' }}>
                        Su cap. iniziale: <strong style={{ color: 'var(--txt-primary)' }}>
                            €{plan.startCapital.toFixed(2)}
                        </strong>
                    </div>
                    {growthPercent !== 0 && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '99px',
                            background: isProfit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: isProfit ? 'var(--accent-green)' : 'var(--accent-red)',
                            fontSize: '11px',
                            fontWeight: 500,
                            marginTop: '8px'
                        }} className="font-mono">
                            {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {isProfit ? '+' : ''}{growthPercent.toFixed(2)}%
                        </div>
                    )}
                </div>

                {/* Right: Total Profit */}
                <div style={{ textAlign: 'right' }}>
                    <div className="stat-label-redesign" style={{ marginBottom: '8px' }}>
                        Profitto Totale (+Accantonato)
                    </div>
                    <div className="font-mono" style={{
                        fontSize: '32px',
                        fontWeight: 400,
                        color: totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        lineHeight: 1
                    }}>
                        {totalProfit >= 0 ? '+' : ''}€{totalProfit.toFixed(2)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--txt-muted)', marginTop: '8px' }}>
                        Netto: <strong style={{ color: 'var(--txt-primary)' }}>
                            €{profit.toFixed(2)}
                        </strong>
                        {bankedAmount > 0 && (
                            <>
                                {' · '}
                                Banked: <strong style={{ color: 'var(--txt-muted)' }}>
                                    €{bankedAmount.toFixed(2)}
                                </strong>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="divider-redesign" style={{ margin: '0 22px' }} />

            {/* Stats Row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 22px',
                gap: 0
            }}>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    paddingLeft: 0
                }}>
                    <div className="font-mono stat-value-pos" style={{ fontSize: '18px' }}>
                        {plan.wins}
                    </div>
                    <div className="stat-label-redesign">Vittorie</div>
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderRight: '1px solid var(--border)'
                }}>
                    <div className="font-mono stat-value-neg" style={{ fontSize: '18px' }}>
                        {plan.losses}
                    </div>
                    <div className="stat-label-redesign">Perdite</div>
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderRight: '1px solid var(--border)'
                }}>
                    <div className="font-mono" style={{ fontSize: '18px', color: 'var(--txt-secondary)' }}>
                        {plan.wins + plan.losses}
                    </div>
                    <div className="stat-label-redesign">Totali</div>
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderRight: '1px solid var(--border)'
                }}>
                    <div className="font-mono" style={{ fontSize: '18px', color: 'var(--txt-muted)' }}>
                        {plan.totalEvents - plan.expectedWins - plan.losses}
                    </div>
                    <div className="stat-label-redesign">Go Over</div>
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    paddingRight: 0
                }}>
                    <div className="font-mono" style={{ fontSize: '18px', color: 'var(--accent-teal)' }}>
                        1.00x
                    </div>
                    <div className="stat-label-redesign">EV Index</div>
                </div>
            </div>

            {/* Divider */}
            <div className="divider-redesign" style={{ margin: '0 22px' }} />

            {/* Progress Bar */}
            <div style={{ padding: '0 22px 18px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--txt-muted)',
                    marginBottom: '8px'
                }}>
                    <span>Progresso</span>
                    <span className="font-mono">
                        {plan.wins}/{plan.expectedWins} vittorie
                    </span>
                </div>
                <div className="progress-track-redesign">
                    <div
                        className="progress-fill-redesign"
                        style={{
                            width: `${plan.expectedWins > 0 ? (plan.wins / plan.expectedWins) * 100 : 0}%`
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default CapitalCard;
