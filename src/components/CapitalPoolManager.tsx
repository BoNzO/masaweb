import React, { useState } from 'react';
import { DollarSign, Plus, History, X } from 'lucide-react';
import type { CapitalPool } from '../types/masaniello';

interface CapitalPoolManagerProps {
    pool: CapitalPool;
    onAddCapital: (amount: number) => void;
    onSetAvailable: (amount: number) => void;
    onClose?: () => void;
}

const CapitalPoolManager: React.FC<CapitalPoolManagerProps> = ({ pool, onAddCapital, onSetAvailable, onClose }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [amount, setAmount] = useState(1000);
    const [showHistory, setShowHistory] = useState(false);
    const [editingAvailable, setEditingAvailable] = useState(false);
    const [availableValue, setAvailableValue] = useState(pool.totalAvailable);

    const handleAdd = () => {
        if (amount <= 0) {
            alert('Inserisci un importo valido');
            return;
        }
        onAddCapital(amount);
        setShowAddForm(false);
        setAmount(1000);
    };

    const handleEditAvailable = () => {
        setEditingAvailable(true);
        setAvailableValue(pool.totalAvailable);
    };

    const handleSaveAvailable = () => {
        if (availableValue < 0) {
            alert('Il capitale disponibile non può essere negativo');
            return;
        }
        onSetAvailable(availableValue);
        setEditingAvailable(false);
    };

    const handleCancelEdit = () => {
        setEditingAvailable(false);
        setAvailableValue(pool.totalAvailable);
    };

    const totalAllocated = Object.values(pool.allocations).reduce((sum, val) => sum + val, 0);

    return (
        <div className="card-body-redesign">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-teal))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow-blue)'
                    }}>
                        <DollarSign size={24} color="#fff" />
                    </div>
                    <div>
                        <h3 className="font-display" style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px' }}>
                            Pool Capitale
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>
                            Gestione capitale comune
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="btn btn-primary"
                    >
                        <Plus size={16} />
                        AGGIUNGI
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="btn btn-ghost"
                            style={{
                                width: '38px',
                                height: '38px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(255,255,255,0.05)'
                            }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {/* Disponibile (editable) */}
                <div
                    style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        cursor: editingAvailable ? 'default' : 'pointer',
                        transition: 'all var(--transition-base)'
                    }}
                    onClick={!editingAvailable ? handleEditAvailable : undefined}
                    onMouseEnter={(e) => !editingAvailable && (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                    onMouseLeave={(e) => !editingAvailable && (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                    <div className="stat-label-redesign">
                        Disponibile {!editingAvailable && <span style={{ fontSize: '9px', opacity: 0.5 }}>(click)</span>}
                    </div>
                    {editingAvailable ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '6px' }}>
                            <input
                                type="number"
                                value={availableValue}
                                onChange={(e) => setAvailableValue(Number(e.target.value))}
                                className="font-mono"
                                style={{
                                    width: '100px',
                                    padding: '4px 8px',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--accent-blue)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--txt-primary)',
                                    fontSize: '13px',
                                    fontWeight: 500
                                }}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveAvailable();
                                    if (e.key === 'Escape') handleCancelEdit();
                                }}
                            />
                            <button
                                onClick={handleSaveAvailable}
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
                        <div className="stat-value-redesign" style={{ color: 'var(--accent-blue)', marginTop: '6px' }}>
                            €{pool.totalAvailable.toFixed(2)}
                        </div>
                    )}
                </div>

                {/* Allocato */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px'
                }}>
                    <div className="stat-label-redesign">Allocato</div>
                    <div className="stat-value-redesign stat-value-pos" style={{ marginTop: '6px' }}>
                        €{totalAllocated.toFixed(2)}
                    </div>
                </div>

                {/* Totale */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px'
                }}>
                    <div className="stat-label-redesign">Totale</div>
                    <div className="stat-value-redesign" style={{ marginTop: '6px' }}>
                        €{(pool.totalAvailable + totalAllocated).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px'
                }}>
                    <label className="stat-label-redesign" style={{ display: 'block', marginBottom: '8px' }}>
                        Importo da Aggiungere (€)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            min={1}
                            step={100}
                            className="font-mono"
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--txt-primary)',
                                fontSize: '14px'
                            }}
                        />
                        <button onClick={handleAdd} className="btn btn-success">
                            CONFERMA
                        </button>
                    </div>
                </div>
            )}

            {/* Allocations */}
            {Object.keys(pool.allocations).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 className="stat-label-redesign" style={{ marginBottom: '12px' }}>
                        Allocazioni Attive
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(pool.allocations).map(([masaId, allocated]) => (
                            <div
                                key={masaId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 14px'
                                }}
                            >
                                <span className="text-xs font-mono" style={{ color: 'var(--txt-secondary)', fontWeight: 600 }}>
                                    {masaId.replace('_', ' #').toUpperCase()}
                                </span>
                                <span className="font-mono stat-value-pos" style={{ fontSize: '14px' }}>
                                    €{allocated.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* History Toggle */}
            <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center' }}
            >
                <History size={14} />
                {showHistory ? 'NASCONDI' : 'MOSTRA'} STORICO TRANSAZIONI
            </button>

            {/* Transaction History */}
            {showHistory && pool.history.length > 0 && (
                <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pool.history.slice().reverse().map((tx) => (
                            <div
                                key={tx.id}
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '12px 14px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span
                                        className="text-xs font-mono"
                                        style={{
                                            color: tx.type === 'allocation' ? 'var(--accent-green)' :
                                                tx.type === 'release' ? 'var(--accent-blue)' :
                                                    'var(--accent-gold)',
                                            fontWeight: 600
                                        }}
                                    >
                                        {tx.type === 'allocation' ? '+ ALLOCAZIONE' :
                                            tx.type === 'release' ? '↩ RILASCIO' :
                                                '⇄ TRASFERIMENTO'}
                                    </span>
                                    <span className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt-primary)' }}>
                                        €{tx.amount.toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--txt-secondary)', marginBottom: '4px' }}>
                                    {tx.description}
                                </p>
                                <p className="text-xs font-mono" style={{ color: 'var(--txt-muted)', fontSize: '10px' }}>
                                    {new Date(tx.timestamp).toLocaleString('it-IT')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CapitalPoolManager;
