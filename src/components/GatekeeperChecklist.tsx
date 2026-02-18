import React from 'react';
import { ClipboardCheck, Globe, AlertTriangle } from 'lucide-react';

interface GatekeeperChecklistProps {
    template: string[];
    checklist: Record<string, boolean>;
    onToggle: (item: string) => void;
    activePair: string;
    onPairChange: (pair: string) => void;
}

const GatekeeperChecklist: React.FC<GatekeeperChecklistProps> = ({
    template,
    checklist,
    onToggle,
    activePair,
    onPairChange
}) => {
    const isComplete = template.every(item => checklist[item]);
    const recentPairs = ['EURUSD', 'NAS', 'BTCUSD', 'GOLD'];

    return (
        <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="card-header-redesign" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        padding: '8px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '10px',
                        color: 'var(--accent-blue)'
                    }}>
                        <ClipboardCheck size={18} />
                    </div>
                    <div>
                        <h3 className="card-title-redesign" style={{ margin: 0 }}>Gatekeeper Checklist</h3>
                        <p style={{ fontSize: '10px', color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: '2px' }}>
                            Rituale di Disciplina
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--bg-surface)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', gap: '6px', marginRight: '8px' }}>
                        {recentPairs.slice(0, 2).map(p => (
                            <button
                                key={p}
                                onClick={() => onPairChange(p)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    color: activePair === p ? 'var(--accent-blue)' : 'var(--txt-muted)',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'color 0.2s'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <div style={{ width: '1px', height: '12px', background: 'var(--border)', margin: '0 4px' }} />
                    <Globe size={12} style={{ color: 'var(--txt-muted)' }} />
                    <input
                        type="text"
                        value={activePair}
                        onChange={(e) => onPairChange(e.target.value.toUpperCase())}
                        placeholder="PAIR"
                        style={{
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--accent-blue)',
                            fontSize: '11px',
                            fontWeight: 800,
                            width: '60px',
                            fontFamily: 'var(--font-mono)'
                        }}
                    />
                </div>
            </div>

            <div className="card-body-redesign">
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px'
                }}>
                    {template.map((item) => {
                        const checked = checklist[item];
                        return (
                            <div
                                key={item}
                                onClick={() => onToggle(item)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    background: checked ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-elevated)',
                                    borderRadius: '16px',
                                    border: checked ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '6px',
                                    border: checked ? 'none' : '2px solid var(--border)',
                                    background: checked ? 'var(--accent-green)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    flexShrink: 0
                                }}>
                                    {checked && <span style={{ fontSize: '12px', fontWeight: 900 }}>✓</span>}
                                </div>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: checked ? 'var(--txt-primary)' : 'var(--txt-secondary)',
                                    lineHeight: 1.3
                                }}>
                                    {item}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {!isComplete && template.length > 0 && (
                    <div style={{
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(245, 158, 11, 0.05)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(245, 158, 11, 0.15)'
                    }}>
                        <AlertTriangle size={16} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
                        <p style={{
                            fontSize: '11px',
                            color: 'var(--accent-orange)',
                            fontWeight: 600,
                            lineHeight: 1.4,
                            margin: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                        }}>
                            Checklist incompleta — la disciplina batte il caso.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GatekeeperChecklist;
