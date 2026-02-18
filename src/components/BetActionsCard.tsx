import React from 'react';
import { CheckCircle, XCircle, MinusCircle, Equal } from 'lucide-react';

interface BetActionsCardProps {
    onWin: () => void;
    onLoss: () => void;
    onPartialWin: () => void;
    onPartialLoss: () => void;
    onBreakEven: () => void;
    isDisabled?: boolean;
}

const BetActionsCard: React.FC<BetActionsCardProps> = ({
    onWin,
    onLoss,
    onPartialWin,
    onPartialLoss,
    onBreakEven,
    isDisabled = false
}) => {
    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="card-header-redesign">
                <h3 className="card-title-redesign">Esito</h3>
            </div>

            <div className="card-body-redesign">
                {/* Primary Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    {/* Win */}
                    <button
                        onClick={onWin}
                        disabled={isDisabled}
                        style={{
                            padding: '16px',
                            background: isDisabled ? 'var(--bg-surface)' : 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))',
                            border: isDisabled ? '1px solid var(--border)' : '1px solid rgba(34,197,94,0.3)',
                            borderRadius: 'var(--radius-md)',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all var(--transition-base)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isDisabled ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => !isDisabled && (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.12))')}
                        onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))')}
                    >
                        <CheckCircle size={28} style={{ color: isDisabled ? 'var(--txt-muted)' : 'var(--accent-green)' }} />
                        <span className="font-display" style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: isDisabled ? 'var(--txt-muted)' : 'var(--accent-green)',
                            letterSpacing: '0.05em'
                        }}>
                            VINTA
                        </span>
                    </button>

                    {/* Loss */}
                    <button
                        onClick={onLoss}
                        disabled={isDisabled}
                        style={{
                            padding: '16px',
                            background: isDisabled ? 'var(--bg-surface)' : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
                            border: isDisabled ? '1px solid var(--border)' : '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 'var(--radius-md)',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all var(--transition-base)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isDisabled ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => !isDisabled && (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.12))')}
                        onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))')}
                    >
                        <XCircle size={28} style={{ color: isDisabled ? 'var(--txt-muted)' : 'var(--accent-red)' }} />
                        <span className="font-display" style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: isDisabled ? 'var(--txt-muted)' : 'var(--accent-red)',
                            letterSpacing: '0.05em'
                        }}>
                            PERSA
                        </span>
                    </button>
                </div>

                {/* Secondary Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {/* Partial Win */}
                    <button
                        onClick={onPartialWin}
                        disabled={isDisabled}
                        className="btn btn-ghost"
                        style={{
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '10px 8px',
                            opacity: isDisabled ? 0.5 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <MinusCircle size={18} style={{ color: 'var(--accent-green)' }} />
                        <span style={{ fontSize: '10px', letterSpacing: '0.05em' }}>PARZ. VINTA</span>
                    </button>

                    {/* Break Even */}
                    <button
                        onClick={onBreakEven}
                        disabled={isDisabled}
                        className="btn btn-ghost"
                        style={{
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '10px 8px',
                            opacity: isDisabled ? 0.5 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Equal size={18} style={{ color: 'var(--accent-blue)' }} />
                        <span style={{ fontSize: '10px', letterSpacing: '0.05em' }}>PAREGGIO</span>
                    </button>

                    {/* Partial Loss */}
                    <button
                        onClick={onPartialLoss}
                        disabled={isDisabled}
                        className="btn btn-ghost"
                        style={{
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '10px 8px',
                            opacity: isDisabled ? 0.5 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <MinusCircle size={18} style={{ color: 'var(--accent-red)' }} />
                        <span style={{ fontSize: '10px', letterSpacing: '0.05em' }}>PARZ. PERSA</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default BetActionsCard;
