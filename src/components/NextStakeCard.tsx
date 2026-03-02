
import React, { useState, useMemo } from 'react';
import { X, TrendingUp, LifeBuoy, AlertCircle, ShieldAlert, Settings } from 'lucide-react';
import type { MasaPlan } from '../types/masaniello';
import { calculateMaxNetProfit } from '../utils/mathUtils';
import { calculateStake, calculateMasanielloHealth } from '../utils/masaLogic';

interface NextStakeCardProps {
    stake: number;
    quota: number;
    potentialWin: number;
    onQuotaChange?: (newQuota: number) => void;
    isDisabled?: boolean;
    warningMessage?: string;
    lastClosedPlan?: MasaPlan | null;
    onDismissLastResult?: () => void;
    onToggleRescue?: () => void;
    onApplyRescue?: (events: number, wins: number, target: number, maxLosses: number) => void;
    isRescueActive?: boolean;
    isRescued?: boolean;
    plan?: MasaPlan;
    mhiThreshold?: number;
    onMhiThresholdChange?: (val: number) => void;
}

const NextStakeCard: React.FC<NextStakeCardProps> = ({
    stake,
    quota,
    potentialWin,
    onQuotaChange,
    isDisabled = false,
    warningMessage,
    lastClosedPlan,
    onDismissLastResult,
    onToggleRescue,
    onApplyRescue,
    isRescueActive = false,
    isRescued = false,
    plan,
    mhiThreshold = 45,
    onMhiThresholdChange
}) => {
    const [editingQuota, setEditingQuota] = useState(false);
    const [quotaValue, setQuotaValue] = useState(quota);
    const [showThresholdConfig, setShowThresholdConfig] = useState(false);

    // Auto-dismiss last result banner after 3 seconds
    React.useEffect(() => {
        if (lastClosedPlan && onDismissLastResult) {
            const timer = setTimeout(() => {
                onDismissLastResult();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [lastClosedPlan, onDismissLastResult]);

    // Rescue Internal State
    const [rescueEvents, setRescueEvents] = useState(2);
    const [rescueWins, setRescueWins] = useState(0);
    const [rescueMaxLosses, setRescueMaxLosses] = useState(plan?.maxConsecutiveLosses || 0);

    // MHI Calculation
    const health = useMemo(() => {
        if (!plan || plan.isRescued) return null;
        return calculateMasanielloHealth(plan, undefined, Number(stake)); // ensuring stake is number
    }, [plan, stake]);

    // Projections
    const { projectedTarget, projectedTargetProfit, projectedStake } = useMemo(() => {
        if (!plan) return { projectedTarget: 0, projectedTargetProfit: 0, projectedStake: 0 };
        const newTotalEvents = plan.remainingEvents + rescueEvents;
        const newTotalWins = plan.remainingWins + rescueWins;
        const profit = calculateMaxNetProfit(
            plan.currentCapital,
            newTotalEvents,
            newTotalWins,
            plan.quota,
            rescueMaxLosses
        );
        const target = plan.currentCapital + profit;
        // Target profit relative to the ORIGINAL start capital
        const targetProfitVsStart = target - plan.startCapital;
        const stake = calculateStake(
            plan.currentCapital,
            newTotalEvents,
            newTotalWins,
            plan.quota,
            target,
            rescueMaxLosses,
            0 // CL starts at 0 for rescue reset logic
        );
        return { projectedTarget: target, projectedTargetProfit: targetProfitVsStart, projectedStake: stake };
    }, [plan, rescueEvents, rescueWins, rescueMaxLosses]);

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="card-title-redesign">Position Size</h3>
                    {isRescued && (
                        <div className="badge-redesign" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent-gold)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '9px' }}>
                            RESCUED
                        </div>
                    )}

                    {/* MHI Indicator */}
                    {health && !isRescued && (
                        <div className="relative group">
                            <div
                                onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                                className={`cursor-pointer flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all hover:scale-105 ${health.score >= 75 ? 'bg-red-500/10 border-red-500/30' :
                                    health.score >= mhiThreshold ? 'bg-amber-500/10 border-amber-500/30' :
                                        'bg-emerald-500/10 border-emerald-500/30'
                                    }`}
                                title={`MHI Score: ${health.score}% | Click to configure alert threshold`}
                            >
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MHI</span>
                                <span className={`text-[10px] font-black ${health.score >= 75 ? 'text-red-400' :
                                    health.score >= mhiThreshold ? 'text-amber-400' :
                                        'text-emerald-400'
                                    }`}>
                                    {health.score}% <span className="text-[8px] opacity-60 ml-px">/ {mhiThreshold}</span>
                                </span>
                                {showThresholdConfig && <Settings size={10} className="text-slate-500 ml-1 animate-spin-slow" />}
                            </div>

                            {/* Threshold Config Popover */}
                            {showThresholdConfig && onMhiThresholdChange && (
                                <div className="absolute top-full left-0 mt-2 z-50 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-48 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Soglia Alert</span>
                                        <button onClick={(e) => { e.stopPropagation(); setShowThresholdConfig(false); }} className="text-slate-500 hover:text-white">
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <input
                                            type="range"
                                            min="20"
                                            max="90"
                                            step="5"
                                            value={mhiThreshold}
                                            onChange={(e) => onMhiThresholdChange(Number(e.target.value))}
                                            className="w-full accent-amber-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-xs font-mono font-bold text-amber-400 w-8 text-right">{mhiThreshold}%</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 leading-tight">
                                        Mostra suggerimento Rescue se MHI &ge; {mhiThreshold}%
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {onToggleRescue && (
                        <button
                            onClick={onToggleRescue}
                            className={`p-1.5 rounded-lg transition-all border ${isRescueActive
                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
                                }`}
                            title="Rescue Mode"
                        >
                            <LifeBuoy size={16} className={isRescueActive ? 'animate-spin-slow' : ''} />
                        </button>
                    )}
                    {isDisabled && (
                        <div className="badge-redesign badge-loss">
                            BLOCCATO
                        </div>
                    )}
                </div>
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
                                    Profitto: €{Math.ceil(lastClosedPlan.currentCapital - lastClosedPlan.startCapital).toLocaleString('it-IT')}
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

                {/* RESCUE CONFIG PANEL (Expandable) */}
                {isRescueActive && plan && onApplyRescue && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        background: 'rgba(15,22,35,0.6)',
                        border: '1px solid rgba(245,158,11,0.2)',
                        borderRadius: 'var(--radius-lg)',
                        animation: 'fade-in-up 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ padding: '4px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', color: 'var(--accent-gold)', display: 'flex' }}>
                                <LifeBuoy size={18} />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--txt-primary)' }}>
                                Rescue Configurator
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                            {/* Events selector */}
                            <div>
                                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <LifeBuoy size={10} /> + Eventi
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setRescueEvents(Math.max(1, rescueEvents - 1))}
                                        style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--txt-primary)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >-</button>
                                    <div style={{ fontSize: '18px', fontWeight: 900, minWidth: '30px', textAlign: 'center', color: 'var(--accent-gold)' }}>
                                        {rescueEvents}
                                    </div>
                                    <button
                                        onClick={() => setRescueEvents(rescueEvents + 1)}
                                        style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--txt-primary)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >+</button>
                                </div>
                            </div>

                            {/* Wins selector */}
                            <div>
                                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <TrendingUp size={10} /> + Vittorie
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {[0, 1, 2, 3, 4, 5].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setRescueWins(n)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                borderRadius: '6px',
                                                background: rescueWins === n ? 'var(--accent-teal)' : 'var(--bg-elevated)',
                                                color: rescueWins === n ? '#fff' : 'var(--txt-muted)',
                                                border: rescueWins === n ? '1px solid var(--accent-teal)' : '1px solid var(--border)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Max Loss selector */}
                            <div>
                                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShieldAlert size={10} /> Max Loss
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => setRescueMaxLosses(Math.max(0, rescueMaxLosses - 1))}
                                        style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--txt-primary)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >-</button>
                                    <div style={{ fontSize: '18px', fontWeight: 900, minWidth: '30px', textAlign: 'center', color: rescueMaxLosses === 0 ? 'var(--txt-muted)' : 'var(--accent-gold)' }}>
                                        {rescueMaxLosses === 0 ? '∞' : rescueMaxLosses}
                                    </div>
                                    <button
                                        onClick={() => setRescueMaxLosses(rescueMaxLosses + 1)}
                                        style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--txt-primary)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >+</button>
                                </div>
                            </div>
                        </div>

                        {/* Projections */}
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '8px', color: 'var(--txt-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Target Profit</div>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: projectedTargetProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                        {projectedTargetProfit >= 0 ? '+' : '-'}€{Math.ceil(Math.abs(projectedTargetProfit)).toLocaleString('it-IT')}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '8px', color: 'var(--txt-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Puntata Prevista</div>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--txt-primary)' }}>
                                        €{Math.ceil(projectedStake).toLocaleString('it-IT')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => onApplyRescue(rescueEvents, rescueWins, projectedTarget, rescueMaxLosses)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--accent-blue)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '11px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Applica Salvagente
                        </button>
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
                        {Math.ceil(stake).toLocaleString('it-IT')}
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
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'var(--bg-elevated)',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--accent-blue)'
                                }}>
                                    <div style={{
                                        fontSize: '9px',
                                        color: 'var(--accent-teal)',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        background: 'rgba(20,184,166,0.1)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(20,184,166,0.2)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        @{(quotaValue).toFixed(2)}
                                    </div>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span style={{ position: 'absolute', left: '2px', fontSize: '16px', color: '#94a3b8', fontWeight: 800 }}>1:</span>
                                        <input
                                            type="number"
                                            value={parseFloat((quotaValue - 1).toFixed(2))}
                                            onChange={(e) => setQuotaValue(Number(e.target.value) + 1)}
                                            min={0.01}
                                            step={0.01}
                                            className="font-mono"
                                            style={{
                                                width: '60px',
                                                padding: '2px 2px 2px 20px',
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--txt-primary)',
                                                fontSize: '16px',
                                                fontWeight: 800,
                                                outline: 'none',
                                                textAlign: 'right'
                                            }}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveQuota();
                                                if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={handleSaveQuota}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'var(--accent-green)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            color: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'var(--accent-red)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            color: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
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
                            €{Math.ceil(potentialWin).toLocaleString('it-IT')}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NextStakeCard;
