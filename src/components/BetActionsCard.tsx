import React from 'react';
import { CheckCircle, XCircle, MinusCircle, Equal, Plus, Shield, Lock, X } from 'lucide-react';

interface BetActionsCardProps {
    onWin: (note?: string) => void;
    onLoss: (note?: string) => void;
    onPartialWin: (note?: string) => void;
    onPartialLoss: (note?: string) => void;
    onBreakEven: (note?: string) => void;
    onHedge?: () => void;
    onHedgeOutcome?: (isWin: boolean) => void;
    onCancelHedge?: () => void;
    isHedgeActive?: boolean;
    session?: { main: boolean | null, hedge: boolean | null } | null;
    nextStake?: number;
    hedgeMultiplier?: number;
    hedgeQuota?: number;
    onSpawnSon?: () => void;
    sonsCompleted?: number;
    sonsFailed?: number;
    isDisabled?: boolean;
    onLockProfit?: (amount: number) => void;
}

const BetActionsCard: React.FC<BetActionsCardProps> = ({
    onWin,
    onLoss,
    onPartialWin,
    onPartialLoss,
    onBreakEven,
    onHedge,
    onHedgeOutcome,
    onCancelHedge,
    isHedgeActive = false,
    session = null,
    nextStake = 0,
    hedgeMultiplier = 0.2,
    hedgeQuota = 3,
    onSpawnSon,
    sonsCompleted = 0,
    sonsFailed = 0,
    isDisabled = false,
    onLockProfit
}) => {
    const [isLocking, setIsLocking] = React.useState(false);
    const [lockValue, setLockValue] = React.useState<number | ''>('');
    const [note, setNote] = React.useState('');

    const handleActionWithNote = (action: (n: string) => void) => {
        action(note);
        setNote('');
    };

    const handleLockSubmit = () => {
        if (lockValue !== '' && lockValue > 0 && onLockProfit) {
            onLockProfit(Number(lockValue));
            setIsLocking(false);
            setLockValue('');
        }
    };

    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="card-header-redesign">
                <h3 className="card-title-redesign">Esito</h3>
            </div>

            <div className="card-body-redesign">
                {/* Note Field */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: '8px', letterSpacing: '0.1em' }}>
                        Diario Trading (Opzionale)
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Annota la qualità operativa o il motivo dell'ingresso..."
                        style={{
                            width: '100%',
                            minHeight: '54px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            fontSize: '11px',
                            color: 'var(--txt-primary)',
                            fontFamily: 'inherit',
                            resize: 'none',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                        }}
                    />
                </div>

                {/* Primary Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    {/* Win */}
                    <button
                        onClick={() => handleActionWithNote(onWin)}
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
                        onClick={() => handleActionWithNote(onLoss)}
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
                        onClick={() => handleActionWithNote(onPartialWin)}
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
                        onClick={() => handleActionWithNote(onBreakEven)}
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
                        <span style={{ fontSize: '10px', letterSpacing: '0.05em' }}>BREAK EVEN</span>
                    </button>

                    {/* Partial Loss */}
                    <button
                        onClick={() => handleActionWithNote(onPartialLoss)}
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

                {/* Grid for Action Buttons (Hedge & Lock Profit) */}
                <div style={{
                    display: (onHedge || onLockProfit) ? 'grid' : 'none',
                    gridTemplateColumns: (onHedge && onLockProfit && !isLocking) ? '1fr 1fr' : '1fr',
                    gap: '12px',
                    marginTop: '12px'
                }}>
                    {/* Hedge Action */}
                    {onHedge && (
                        <div>
                            <button
                                onClick={onHedge}
                                disabled={isDisabled}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: isHedgeActive
                                        ? 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(79,70,229,0.2))'
                                        : 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(30,27,75,0.1))',
                                    border: isHedgeActive
                                        ? '1px solid rgba(129,140,248,0.7)'
                                        : '1px solid rgba(99,102,241,0.5)',
                                    borderRadius: 'var(--radius-md)',
                                    color: isHedgeActive ? '#ffffff' : '#818cf8',
                                    fontWeight: 900,
                                    fontSize: '11px',
                                    letterSpacing: '0.15em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: isDisabled ? 0.3 : 1,
                                    textTransform: 'uppercase',
                                    boxShadow: isHedgeActive
                                        ? '0 0 25px -5px rgba(99,102,241,0.5), inset 0 0 15px rgba(99,102,241,0.1)'
                                        : '0 4px 12px rgba(0,0,0,0.1)',
                                    height: '100%'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isDisabled && !isHedgeActive) {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.1))';
                                        e.currentTarget.style.borderColor = 'rgba(129,140,248,0.8)';
                                        e.currentTarget.style.color = '#a5b4fc';
                                        e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2), 0 0 15px rgba(99,102,241,0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isDisabled && !isHedgeActive) {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(30,27,75,0.1))';
                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                                        e.currentTarget.style.color = '#818cf8';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                    }
                                }}
                            >
                                <div className={`p-1.5 rounded-lg ${isHedgeActive ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]' : 'bg-indigo-500/20'} transition-all duration-500`}>
                                    <Shield size={14} className={isHedgeActive ? 'animate-pulse text-white' : 'text-indigo-400'} />
                                </div>
                                <span style={{ textShadow: isHedgeActive ? '0 0 8px rgba(255,255,255,0.5)' : 'none' }}>
                                    {isHedgeActive ? 'MODALITÀ HEDGE ATTIVA' : 'APRI COPERTURA (HEDGE)'}
                                </span>
                            </button>

                            {/* SESSION CONTROLS */}
                            {isHedgeActive && (
                                <div className="animate-in slide-in-from-top-2 duration-300" style={{ marginTop: '12px' }}>
                                    <div style={{
                                        background: 'rgba(99,102,241,0.1)',
                                        border: '1px solid rgba(99,102,241,0.2)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                            <Shield size={14} className="text-indigo-400" />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'white', letterSpacing: '0.05em' }}>SESSIONE HEDGE</div>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                                                    Stake: €{hedgeQuota > 1
                                                        ? Math.ceil(nextStake / (hedgeQuota - 1))
                                                        : Math.ceil(nextStake * hedgeMultiplier)}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <button
                                                onClick={() => onHedgeOutcome?.(true)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    borderRadius: '6px',
                                                    border: '1px solid',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    background: session?.hedge === true ? 'var(--accent-green)' : 'rgba(34,197,94,0.1)',
                                                    borderColor: session?.hedge === true ? 'var(--accent-green)' : 'rgba(34,197,94,0.3)',
                                                    color: session?.hedge === true ? 'white' : 'var(--accent-green)',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                Hedge Vinto
                                            </button>
                                            <button
                                                onClick={() => onHedgeOutcome?.(false)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    borderRadius: '6px',
                                                    border: '1px solid',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    background: session?.hedge === false ? 'var(--accent-red)' : 'rgba(239,68,68,0.1)',
                                                    borderColor: session?.hedge === false ? 'var(--accent-red)' : 'rgba(239,68,68,0.3)',
                                                    color: session?.hedge === false ? 'white' : 'var(--accent-red)',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                Hedge Perso
                                            </button>
                                        </div>

                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '8px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Esito Principale:</div>
                                            <div style={{ fontSize: '9px', fontWeight: 900, color: session?.main === true ? 'var(--accent-green)' : session?.main === false ? 'var(--accent-red)' : 'rgba(255,255,255,0.3)' }}>
                                                {session?.main === true ? 'WIN' : session?.main === false ? 'LOSS' : 'ATTESA...'}
                                            </div>
                                        </div>

                                        <button
                                            onClick={onCancelHedge}
                                            style={{
                                                width: '100%',
                                                marginTop: '8px',
                                                padding: '4px',
                                                fontSize: '8px',
                                                fontWeight: 900,
                                                color: 'rgba(255,255,255,0.3)',
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em'
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                                        >
                                            Annulla Sessione
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lock Profit Action */}
                    {onLockProfit && (
                        <div style={{ gridColumn: isLocking ? '1 / -1' : 'auto' }}>
                            {isLocking ? (
                                <div className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(245,158,11,0.3)',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden'
                                    }}>
                                        <input
                                            type="number"
                                            value={lockValue}
                                            onChange={(e) => setLockValue(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="Importo da bloccare..."
                                            autoFocus
                                            style={{
                                                flex: 1,
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '8px 12px',
                                                fontSize: '12px',
                                                color: '#fbbf24',
                                                outline: 'none',
                                                fontWeight: 700
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleLockSubmit();
                                                if (e.key === 'Escape') setIsLocking(false);
                                            }}
                                        />
                                        <button
                                            onClick={handleLockSubmit}
                                            style={{
                                                padding: '0 16px',
                                                background: '#fbbf24',
                                                color: '#000',
                                                border: 'none',
                                                fontSize: '10px',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            LOCK
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setIsLocking(false)}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--txt-muted)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsLocking(true)}
                                    disabled={isDisabled}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'rgba(245,158,11,0.05)',
                                        border: '1px solid rgba(245,158,11,0.3)',
                                        borderRadius: 'var(--radius-md)',
                                        color: '#fbbf24',
                                        fontWeight: 800,
                                        fontSize: '11px',
                                        letterSpacing: '0.05em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        opacity: isDisabled ? 0.5 : 1,
                                        height: '100%'
                                    }}
                                    onMouseEnter={(e) => !isDisabled && (e.currentTarget.style.background = 'rgba(245,158,11,0.12)')}
                                    onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.background = 'rgba(245,158,11,0.05)')}
                                >
                                    <Lock size={14} /> PRELEVA (LOCK PROFIT)
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* HIERARCHICAL ACTIONS */}
                {onSpawnSon && (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                        {(sonsCompleted > 0 || sonsFailed > 0) && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '16px',
                                marginBottom: '12px',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={10} /> {sonsCompleted} Vinte
                                </span>
                                <span style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <XCircle size={10} /> {sonsFailed} Perse
                                </span>
                            </div>
                        )}
                        <button
                            onClick={onSpawnSon}
                            disabled={isDisabled}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))',
                                border: '1px solid rgba(59,130,246,0.5)',
                                borderRadius: 'var(--radius-md)',
                                color: '#60a5fa',
                                fontWeight: 800,
                                fontSize: '12px',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: isDisabled ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => !isDisabled && (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))')}
                            onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))')}
                        >
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: 'rgba(59,130,246,0.2)',
                                border: '1px solid rgba(59,130,246,0.3)'
                            }}>
                                <Plus size={14} />
                            </span>
                            DELEGA A FIGLIO (RISCHIO FRAZIONATO)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BetActionsCard;
