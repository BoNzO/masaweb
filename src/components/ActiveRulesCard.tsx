import React from 'react';
import { ChevronDown, CheckSquare, ShieldCheck } from 'lucide-react';

export const AVAILABLE_RULES = [
    { id: 'auto_bank_100', label: 'Banking Target Settimanale', desc: 'Incassa % profitto al raggiungimento del target' },
    { id: 'profit_milestone', label: 'Banking Progressivo (Milestone)', desc: 'Incassa % profitto ogni volta che raddoppi il capitale' },
    { id: 'smart_auto_close', label: 'Smart Auto Close', desc: 'Chiudi in pari se possibile dopo sequenza negativa' },
    { id: 'stop_loss', label: 'Stop Loss', desc: 'Interrompi il piano se raggiungi il limite di perdite consecutive' },
    { id: 'first_win', label: 'Prima Vittoria Garantita (Bonus)', desc: 'Rimuovi rischio iniziale dopo prima vittoria' },
    { id: 'back_positive', label: 'Torna in Positivo', desc: 'Regola dinamica per recupero rapido' }
];

interface ActiveRulesCardProps {
    activeRules: string[];
    onToggleRule: (ruleId: string) => void;
    onToggleAll: (all: boolean) => void;
}

const ActiveRulesCard: React.FC<ActiveRulesCardProps> = ({ activeRules = [], onToggleRule, onToggleAll }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'none',
                    border: 'none',
                }}
            >
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
                >
                    <div style={{
                        padding: '6px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '8px',
                        color: 'var(--accent-green)'
                    }}>
                        <ShieldCheck size={16} />
                    </div>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--txt-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Regole Attive ({activeRules.length})
                    </span>
                    <ChevronDown
                        size={16}
                        style={{
                            color: 'var(--txt-muted)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleAll(activeRules.length < AVAILABLE_RULES.length);
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-blue)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                    {activeRules.length === AVAILABLE_RULES.length ? 'Disattiva Tutte' : 'Attiva Tutte'}
                </button>
            </div>

            {isExpanded && (
                <div style={{
                    padding: '0 20px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '8px',
                    animation: 'fade-in 0.3s ease-out'
                }}>
                    {AVAILABLE_RULES.map((rule) => {
                        const isEnabled = activeRules.includes(rule.id);
                        return (
                            <div
                                key={rule.id}
                                onClick={() => onToggleRule(rule.id)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    background: isEnabled ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-elevated)',
                                    border: isEnabled ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: isEnabled ? 'var(--txt-primary)' : 'var(--txt-secondary)'
                                    }}>
                                        {rule.label}
                                    </span>
                                </div>
                                {isEnabled && <CheckSquare size={14} style={{ color: 'var(--accent-green)' }} />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ActiveRulesCard;
