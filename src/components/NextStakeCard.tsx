import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface NextStakeCardProps {
    stake: number;
    quota: number;
    potentialWin: number;
    onQuotaChange?: (newQuota: number) => void;
    isDisabled?: boolean;
    warningMessage?: string;
    lastClosedPlan?: any;
    onDismissLastResult?: () => void;
}

const NextStakeCard: React.FC<NextStakeCardProps> = ({
    stake,
    quota,
    potentialWin,
    onQuotaChange,
    isDisabled = false,
    warningMessage,
    lastClosedPlan,
    onDismissLastResult
}) => {
    const [editingQuota, setEditingQuota] = useState(false);
    const [quotaValue, setQuotaValue] = useState(quota);

    const handleSaveQuota = () => {
        if (quotaValue >= 1.01 && onQuotaChange) {
            onQuotaChange(quotaValue);
            setEditingQuota(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingQuota(false);
        setQuotaValue(quota);
    };

    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="card-header-redesign">
                <h3 className="card-title-redesign">Position Size</h3>
                {isDisabled && (
                    <div className="badge-redesign badge-loss">
                        BLOCCATO
                    </div>
                )}
            </div>

            <div className="card-body-redesign">
                {/* Last Result Banner */}
                {lastClosedPlan && (
                    <div style={{
                        background: (lastClosedPlan.currentCapital < lastClosedPlan.startCapital - 0.01)
                            ? 'rgba(239,68,68,0.1)'
                            : 'rgba(16,185,129,0.1)',
                        border: (lastClosedPlan.currentCapital < lastClosedPlan.startCapital - 0.01)
                            ? '1px solid rgba(239,68,68,0.3)'
                            : '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        animation: 'fade-in 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: (lastClosedPlan.currentCapital < lastClosedPlan.startCapital - 0.01)
                                    ? 'var(--accent-red)'
                                    : 'var(--accent-green)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', margin: 'auto' }}>
                                    {(lastClosedPlan.currentCapital < lastClosedPlan.startCapital - 0.01) ? '!' : '✓'}
                                </span>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: (lastClosedPlan.currentCapital < lastClosedPlan.startCapital - 0.01)
                                        ? 'var(--accent-red)'
                                        : 'var(--accent-green)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Ciclo Precedente: {(lastClosedPlan.currentCapital < lastClosedPlan.startCapital - 0.01) ? 'NEGATIVO' : 'POSITIVO'}
                                    {lastClosedPlan.triggeredRule && (
                                        <span style={{
                                            marginLeft: '6px',
                                            opacity: 0.7,
                                            fontSize: '9px',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            background: 'rgba(255,255,255,0.1)',
                                            fontWeight: 500
                                        }}>
                                            Regola: {
                                                lastClosedPlan.triggeredRule === 'all_wins' ? 'Piano Completato' :
                                                    lastClosedPlan.triggeredRule === 'max_losses' ? 'Max Perdite' :
                                                        lastClosedPlan.triggeredRule === 'impossible' ? 'Masa Impossibile' :
                                                            lastClosedPlan.triggeredRule === 'first_win' ? 'Salvaguardia (1ª Vittoria)' :
                                                                lastClosedPlan.triggeredRule === 'back_positive' ? 'Torna in Positivo' :
                                                                    lastClosedPlan.triggeredRule === 'auto_bank_100' ? 'Target Settimanale' :
                                                                        lastClosedPlan.triggeredRule === 'smart_auto_close' ? 'Smart Close' :
                                                                            lastClosedPlan.triggeredRule === 'profit_milestone' ? 'Milestone' :
                                                                                lastClosedPlan.triggeredRule === 'profit_90' ? 'Profit 90%' :
                                                                                    lastClosedPlan.triggeredRule
                                            }
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#7f92b0', fontWeight: 500, marginTop: '2px' }}>
                                    Profitto: €{(lastClosedPlan.currentCapital - lastClosedPlan.startCapital).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        {onDismissLastResult && (
                            <button
                                onClick={onDismissLastResult}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--txt-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '4px'
                                }}
                            >
                                <span style={{ fontSize: '14px' }}>✕</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Warning Message */}
                {warningMessage && (
                    <div style={{
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'start',
                        gap: '10px'
                    }}>
                        <AlertCircle size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '1px' }} />
                        <p className="text-xs" style={{ color: 'var(--accent-gold)', lineHeight: 1.5 }}>
                            {warningMessage}
                        </p>
                    </div>
                )}

                {/* Main Stake Display */}
                <div style={{
                    background: isDisabled ? 'var(--bg-surface)' : 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.08))',
                    border: isDisabled ? '1px solid var(--border)' : '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    opacity: isDisabled ? 0.5 : 1
                }}>
                    <div className="stat-label-redesign" style={{ marginBottom: '12px' }}>
                        Size
                    </div>
                    <div className="font-mono" style={{
                        fontSize: '48px',
                        fontWeight: 300,
                        letterSpacing: '-2px',
                        lineHeight: 1,
                        color: isDisabled ? 'var(--txt-muted)' : 'var(--accent-blue)'
                    }}>
                        <span style={{
                            fontSize: '24px',
                            verticalAlign: 'top',
                            marginTop: '12px',
                            display: 'inline-block',
                            color: isDisabled ? 'var(--txt-muted)' : 'var(--txt-secondary)'
                        }}>
                            €
                        </span>
                        {stake.toFixed(2)}
                    </div>
                </div>

                {/* Quota and Win Potential */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Quota (editable) */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        cursor: !isDisabled && !editingQuota ? 'pointer' : 'default',
                        transition: 'all var(--transition-base)'
                    }}
                        onClick={!isDisabled && !editingQuota ? () => setEditingQuota(true) : undefined}
                        onMouseEnter={(e) => !isDisabled && !editingQuota && (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                        onMouseLeave={(e) => !isDisabled && !editingQuota && (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                        <div className="stat-label-redesign" style={{ marginBottom: '8px' }}>
                            R:R {!isDisabled && !editingQuota && <span style={{ fontSize: '9px', opacity: 0.5 }}>(click)</span>}
                        </div>
                        {editingQuota ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <input
                                        type="number"
                                        value={quotaValue}
                                        onChange={(e) => setQuotaValue(Number(e.target.value))}
                                        min={1.01}
                                        step={0.01}
                                        className="font-mono"
                                        style={{
                                            width: '80px',
                                            padding: '4px 8px',
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--accent-blue)',
                                            borderRadius: 'var(--radius-sm)',
                                            color: 'var(--txt-primary)',
                                            fontSize: '14px',
                                            fontWeight: 500
                                        }}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveQuota();
                                            if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                    />
                                    <div style={{ fontSize: '14px', color: 'var(--accent-teal)', fontWeight: 800, marginTop: '2px' }}>
                                        1:{parseFloat((quotaValue - 1).toFixed(2))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveQuota}
                                    style={{
                                        padding: '4px 8px',
                                        background: 'var(--accent-green)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✓
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    style={{
                                        padding: '4px 8px',
                                        background: 'var(--accent-red)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <div style={{
                                    fontSize: '28px',
                                    color: 'var(--accent-teal)',
                                    fontWeight: 900,
                                    lineHeight: '1'
                                }}>
                                    1:{parseFloat((quota - 1).toFixed(2))}
                                </div>
                                <div className="font-mono" style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'var(--txt-muted)',
                                    borderLeft: '1px solid var(--border)',
                                    paddingLeft: '8px'
                                }}>
                                    @{quota.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Potential Win */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px'
                    }}>
                        <div className="stat-label-redesign" style={{ marginBottom: '8px' }}>
                            Vincita Potenziale
                        </div>
                        <div className="font-mono stat-value-pos" style={{ fontSize: '20px' }}>
                            €{potentialWin.toFixed(2)}
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default NextStakeCard;
