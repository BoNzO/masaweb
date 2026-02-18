import React from 'react';
import { Target, AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';

interface PlanStatsCardProps {
    plan: MasaPlan;
}

const PlanStatsCard: React.FC<PlanStatsCardProps> = ({ plan }) => {
    const eventsPlayed = plan.totalEvents - plan.remainingEvents;
    const progressPercent = plan.totalEvents > 0 ? (eventsPlayed / plan.totalEvents) * 100 : 0;
    const totalAllowedErrors = plan.totalEvents - plan.expectedWins;
    const structuralLosses = plan.totalEvents - plan.expectedWins - (plan.remainingEvents - plan.remainingWins);
    const errorsRemaining = totalAllowedErrors - structuralLosses;

    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="card-header-redesign">
                <h3 className="card-title-redesign">Statistiche Piano</h3>
                <div className="badge-redesign" style={{
                    background: plan.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                    color: plan.status === 'active' ? 'var(--accent-green)' : 'var(--accent-blue)',
                    border: plan.status === 'active' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(99,102,241,0.25)'
                }}>
                    {plan.status === 'active' ? '● ATTIVO' : '◉ COMPLETATO'}
                </div>
            </div>

            <div className="card-body-redesign">
                {/* Grid Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    {/* Eventi Rimanenti */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(99,102,241,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Target size={18} style={{ color: 'var(--accent-blue)' }} />
                        </div>
                        <div>
                            <div className="stat-label-redesign">Eventi Rimanenti</div>
                            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 500, color: 'var(--txt-primary)' }}>
                                {plan.remainingEvents}
                            </div>
                        </div>
                    </div>

                    {/* Vittorie Rimanenti */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(34,197,94,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
                        </div>
                        <div>
                            <div className="stat-label-redesign">Vittorie Rimanenti</div>
                            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 500, color: 'var(--accent-green)' }}>
                                {plan.remainingWins}
                            </div>
                        </div>
                    </div>

                    {/* Errori Rimanenti */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: errorsRemaining <= 1 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertTriangle size={18} style={{ color: errorsRemaining <= 1 ? 'var(--accent-red)' : 'var(--accent-gold)' }} />
                        </div>
                        <div>
                            <div className="stat-label-redesign">Errori Rimanenti</div>
                            <div className="font-mono" style={{
                                fontSize: '20px',
                                fontWeight: 500,
                                color: errorsRemaining <= 1 ? 'var(--accent-red)' : 'var(--accent-gold)'
                            }}>
                                {errorsRemaining}
                            </div>
                        </div>
                    </div>

                    {/* Capitale Obiettivo */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(6,182,212,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Shield size={18} style={{ color: 'var(--accent-teal)' }} />
                        </div>
                        <div>
                            <div className="stat-label-redesign">Obiettivo</div>
                            <div className="font-mono" style={{ fontSize: '16px', fontWeight: 500, color: 'var(--accent-teal)' }}>
                                €{plan.targetCapital.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Section */}
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: 'var(--txt-muted)',
                        marginBottom: '8px'
                    }}>
                        <span>Progresso Eventi</span>
                        <span className="font-mono">
                            {eventsPlayed}/{plan.totalEvents} eventi
                        </span>
                    </div>
                    <div className="progress-track-redesign">
                        <div
                            className="progress-fill-redesign"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Additional Info */}
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--txt-secondary)' }}>Quota Media:</span>
                        <span className="font-mono" style={{ color: 'var(--txt-primary)', fontWeight: 600 }}>
                            {plan.quota.toFixed(2)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                        <span style={{ color: 'var(--txt-secondary)' }}>Vittorie Attese:</span>
                        <span className="font-mono" style={{ color: 'var(--txt-primary)', fontWeight: 600 }}>
                            {plan.expectedWins}/{plan.totalEvents}
                        </span>
                    </div>
                    {plan.maxConsecutiveLosses && plan.maxConsecutiveLosses > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                            <span style={{ color: 'var(--txt-secondary)' }}>Max Perdite Consecutive:</span>
                            <span className="font-mono" style={{
                                color: (plan.currentConsecutiveLosses || 0) >= plan.maxConsecutiveLosses ? 'var(--accent-red)' : 'var(--txt-primary)',
                                fontWeight: 600
                            }}>
                                {plan.currentConsecutiveLosses || 0}/{plan.maxConsecutiveLosses}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlanStatsCard;
