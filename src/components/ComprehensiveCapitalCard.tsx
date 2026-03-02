import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { calculateMasaDenominator } from '../utils/mathUtils';
import type { MasaPlan } from '../types/masaniello';

interface ComprehensiveCapitalCardProps {
    plan: MasaPlan;
    history: MasaPlan[];
    lockedToSons?: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-2xl text-[10px]" style={{ minWidth: '120px' }}>
                <p className="font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-700/50 pb-1">{payload[0].payload.name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--txt-secondary)' }}>CAPITALE:</span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>€{Math.ceil(payload[0].value).toLocaleString('it-IT')}</span>
                </div>
            </div>
        );
    }
    return null;
};

const ComprehensiveCapitalCard: React.FC<ComprehensiveCapitalCardProps> = ({
    plan,
    history,
    lockedToSons = 0
}) => {
    const totalBanked = history.reduce((sum, p) => sum + (p.accumulatedAmount || 0), 0);
    const instanceStartCapital = history.length > 0 ? history[0].startCapital : plan.startCapital;
    // Calculate total perceived worth including the locked capital to prevent artificial drops in Father's profit
    const totalWorth = plan.currentCapital + totalBanked + lockedToSons;
    const totalInstanceProfit = totalWorth - instanceStartCapital;

    const currentPlanProfit = (plan.currentCapital + lockedToSons) - plan.startCapital;
    const isProfit = totalInstanceProfit >= 0;
    const growthPercent = instanceStartCapital > 0 ? (totalInstanceProfit / instanceStartCapital) * 100 : 0;

    const missionTargetProfit = (plan.fatherStake && plan.fatherQuota)
        ? (plan.fatherStake * (plan.fatherQuota - 1))
        : (plan.targetCapital - plan.startCapital);

    const isHierarchy = plan.hierarchyType === 'SON';
    const displayLeftProfit = isHierarchy ? totalInstanceProfit : currentPlanProfit;
    const displayRightTarget = isHierarchy ? missionTargetProfit : (plan.targetCapital - plan.startCapital);

    // Calculate dynamic EV Index (Success Probability Ratio)
    const evIndex = React.useMemo(() => {
        if (plan.status !== 'active') return 1.00;
        if (plan.remainingWins <= 0) return 1.00;

        try {
            const q = plan.quota;
            const m = plan.maxConsecutiveLosses || 0;

            // Current State Success Probability
            const denNow = calculateMasaDenominator(
                plan.remainingEvents,
                plan.remainingWins,
                plan.currentConsecutiveLosses || 0,
                m,
                q
            );
            const probNow = denNow / Math.pow(q, plan.remainingEvents);

            // Initial State Success Probability
            const denStart = calculateMasaDenominator(
                plan.totalEvents,
                plan.expectedWins,
                0,
                m,
                q
            );
            const probStart = denStart / Math.pow(q, plan.totalEvents);

            if (probStart <= 0) return 1.00;

            // Ratio: Are we more or less likely to succeed than at the start?
            return Math.max(0, probNow / probStart);
        } catch (e) {
            return 1.00;
        }
    }, [plan]);

    const evColor = evIndex > 1.02 ? 'var(--accent-green)' : (evIndex < 0.98 ? 'var(--accent-red)' : 'var(--accent-teal)');
    const evStatus = evIndex > 1.02 ? 'Sopra Media' : (evIndex < 0.98 ? 'Sotto Media' : 'In Media');
    const evBarWidth = Math.min(100, (evIndex / 2) * 100); // Scale: 2.0x = 100%

    // Prepare chart data for Recharts
    const chartData = React.useMemo(() => {
        const data: { name: string; capital: number; index: number }[] = [];

        // Initial point
        let runningCapital = history.length > 0 ? history[0].startCapital : plan.startCapital;
        data.push({ name: 'Start', capital: runningCapital, index: 0 });

        let eventCount = 1;

        // Cumulative from history
        history.forEach(p => {
            p.events.forEach(e => {
                if (!e.isSystemLog) {
                    data.push({
                        name: `C${p.generationNumber} E${e.id}`,
                        capital: e.capitalAfter,
                        index: eventCount++
                    });
                }
            });
        });

        // Current plan events
        plan.events.forEach(e => {
            if (!e.isSystemLog) {
                data.push({
                    name: `C${plan.generationNumber} E${e.id}`,
                    capital: e.capitalAfter,
                    index: eventCount++
                });
            }
        });

        return data;
    }, [history, plan]);

    return (
        <div className="card-redesign animate-fade-up">
            {/* Top Section: Capital Display */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0,
                padding: '28px 32px 20px',
                borderBottom: '1px solid var(--border)'
            }}>
                {/* Left: Current Capital */}
                <div>
                    <div className="stat-label-redesign" style={{ marginBottom: '10px' }}>
                        CAPITALE CORRENTE
                    </div>
                    <div className="font-mono" style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '12px',
                        marginBottom: '8px'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            fontWeight: 300,
                            letterSpacing: '-2px',
                            lineHeight: 1,
                            color: 'var(--txt-primary)'
                        }}>
                            <span style={{
                                fontSize: '24px',
                                verticalAlign: 'top',
                                color: 'var(--txt-secondary)'
                            }}>
                                €
                            </span>
                            {Math.ceil(plan.currentCapital).toLocaleString('it-IT')}
                        </div>
                        {lockedToSons > 0 && (
                            <div className="text-orange-400" style={{
                                fontSize: '28px',
                                fontWeight: 400,
                                letterSpacing: '-1px'
                            }}>
                                <span style={{ fontSize: '20px', verticalAlign: 'top', opacity: 0.8 }}>+€</span>
                                {Math.ceil(lockedToSons).toLocaleString('it-IT')}
                                <span className="text-[11px] font-bold uppercase tracking-widest opacity-80 ml-2" style={{ letterSpacing: '1px' }}>
                                    Assegnati ai Figli
                                </span>
                            </div>
                        )}
                    </div>

                    {growthPercent !== 0 && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 12px',
                            borderRadius: '99px',
                            background: isProfit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: isProfit ? 'var(--accent-green)' : 'var(--accent-red)',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginTop: '10px'
                        }} className="font-mono">
                            {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isProfit ? '+' : ''}{Math.ceil(growthPercent)}%
                        </div>
                    )}
                </div>

                {/* Right: Total Profit */}
                <div style={{ textAlign: 'right' }}>
                    <div className="stat-label-redesign" style={{ marginBottom: '10px' }}>
                        PROFITTO TOTALE
                    </div>
                    <div className="font-mono" style={{
                        fontSize: '48px',
                        fontWeight: 300,
                        letterSpacing: '-2px',
                        color: totalInstanceProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        lineHeight: 1,
                        marginBottom: '8px'
                    }}>
                        {totalInstanceProfit >= 0 ? '+' : ''}€{Math.ceil(totalInstanceProfit).toLocaleString('it-IT')}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>
                        Performance Totale Missione
                    </div>
                </div>
            </div>

            {/* Configuration Overview Row */}
            <div style={{
                background: 'rgba(59,130,246,0.03)',
                padding: '20px 32px',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                }}>
                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, var(--border))' }}></div>
                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', color: '#7f92b0', textTransform: 'uppercase' }}>Configurazione Masaniello Attuale</span>
                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }}></div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: plan.hierarchyType === 'SON' ? '0.7fr 0.7fr 0.7fr 0.7fr 1.6fr 1.6fr' : '0.8fr 0.8fr 0.8fr 0.8fr 2.1fr',
                    gap: '1px',
                    background: 'var(--border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ padding: '16px 0', textAlign: 'center', background: 'var(--bg-card)' }}>
                        <div className="font-mono stat-value-pos" style={{ marginBottom: '4px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '24px' }}>{plan.wins}</span>
                            <span style={{ fontSize: '14px', opacity: 0.5 }}>/ {plan.expectedWins}</span>
                        </div>
                        <div className="stat-label-redesign">VITTORIE</div>
                    </div>

                    <div style={{ padding: '16px 0', textAlign: 'center', background: 'var(--bg-card)' }}>
                        <div className="font-mono stat-value-neg" style={{ marginBottom: '4px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '24px' }}>{plan.losses}</span>
                            <span style={{ fontSize: '14px', opacity: 0.5 }}>/ {plan.totalEvents - plan.expectedWins}</span>
                        </div>
                        <div className="stat-label-redesign">PERDITE</div>
                    </div>

                    <div style={{ padding: '16px 0', textAlign: 'center', background: 'var(--bg-card)' }}>
                        <div className="font-mono" style={{ color: 'var(--txt-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '24px' }}>{plan.wins + plan.losses}</span>
                            <span style={{ fontSize: '14px', opacity: 0.5 }}>/ {plan.totalEvents}</span>
                        </div>
                        <div className="stat-label-redesign">TOTALI</div>
                    </div>

                    <div style={{ padding: '16px 0', textAlign: 'center', background: 'var(--bg-card)' }}>
                        <div className="font-mono" style={{ color: 'var(--accent-orange)', marginBottom: '4px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '24px' }}>{plan.currentConsecutiveLosses || 0}</span>
                            <span style={{ fontSize: '14px', opacity: 0.5 }}>/ {plan.maxConsecutiveLosses || 0}</span>
                        </div>
                        <div className="stat-label-redesign">RED LINE</div>
                    </div>

                    <div style={{
                        padding: '16px 0',
                        textAlign: 'center',
                        background: 'linear-gradient(to bottom, rgba(34,197,94,0.05), transparent)',
                        position: 'relative'
                    }}>
                        <div className="font-mono" style={{
                            color: displayLeftProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            gap: '2px'
                        }}>
                            <span style={{ fontSize: '24px', fontWeight: 700 }}>
                                €{Math.ceil(Math.abs(displayLeftProfit)).toLocaleString('it-IT')}
                            </span>
                            <span style={{ fontSize: '16px', opacity: 0.3, margin: '0 8px' }}>/</span>
                            <span style={{ fontSize: '22px', color: displayRightTarget >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 800 }}>
                                {displayRightTarget >= 0 ? '+' : ''}€{Math.ceil(Math.abs(displayRightTarget)).toLocaleString('it-IT')}
                            </span>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                opacity: 0.6,
                                marginLeft: '8px',
                                background: displayLeftProfit >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                color: displayLeftProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}>
                                {Math.floor(Math.max(0, (displayLeftProfit / (displayRightTarget || 1)) * 100))}%
                            </span>
                        </div>
                        <div className="stat-label-redesign" style={{ color: displayRightTarget >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', opacity: 0.7 }}>
                            {isHierarchy ? 'OBIETTIVO MISSIONE' : 'TARGET PIANO'}
                        </div>
                    </div>

                    {plan.hierarchyType === 'SON' && (
                        <div style={{
                            padding: '16px 0',
                            textAlign: 'center',
                            background: 'linear-gradient(to bottom, rgba(59,130,246,0.1), transparent)',
                            position: 'relative'
                        }}>
                            <div className="font-mono" style={{
                                color: 'var(--accent-blue)',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'center',
                                gap: '4px'
                            }}>
                                <span style={{ fontSize: '24px', fontWeight: 800 }}>
                                    {Math.floor(Math.max(0, (totalInstanceProfit / (
                                        plan.fatherStake && plan.fatherQuota
                                            ? Math.max(1, plan.fatherStake * (plan.fatherQuota - 1))
                                            : Math.max(1, (plan.targetCapital || 1) - plan.startCapital)
                                    )) * 100))}%
                                </span>
                            </div>
                            <div className="stat-label-redesign" style={{ color: 'var(--accent-blue)', opacity: 0.8 }}>MISSIONE PADRE</div>
                            <div style={{ fontSize: '9px', color: 'var(--txt-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '4px' }}>
                                TARGET: €{
                                    plan.fatherStake && plan.fatherQuota
                                        ? Math.ceil(plan.fatherStake * (plan.fatherQuota - 1)).toLocaleString('it-IT')
                                        : Math.ceil((plan.targetCapital || 0) - plan.startCapital).toLocaleString('it-IT')
                                } (UTILE)
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recharts Section */}
            <div style={{ padding: '24px 32px', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ width: '100%', height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCapitalIndiv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis
                                dataKey="index"
                                stroke="var(--txt-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                hide
                            />
                            <YAxis
                                stroke="var(--txt-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                                tickFormatter={(value) => `€${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="capital"
                                stroke="var(--accent-blue)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorCapitalIndiv)"
                                animationDuration={1000}
                                dot={{ fill: 'var(--accent-blue)', strokeWidth: 2, r: 4, stroke: 'var(--bg-app)' }}
                                activeDot={{ r: 6, stroke: 'var(--accent-blue)', strokeWidth: 2, fill: '#fff' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* EV Analysis Bar */}
            <div style={{
                padding: '20px 32px',
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
                borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="stat-label-redesign" style={{ minWidth: '80px' }}>
                        EV ANALYSIS
                    </div>
                    <div className="font-mono" style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: evColor,
                        minWidth: '60px'
                    }}>
                        {evIndex.toFixed(2)}x
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: 'var(--bg-elevated)',
                            borderRadius: '99px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${evBarWidth}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${evColor}, var(--accent-blue))`,
                                borderRadius: '99px',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <div style={{
                            position: 'absolute',
                            left: `${evBarWidth}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '10px',
                            color: 'var(--txt-muted)',
                            fontFamily: 'var(--font-mono)'
                        }}>
                            W: {plan.wins}
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '11px',
                        color: 'var(--txt-muted)',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        <span>{evStatus}</span>
                        <span>EV: {(evIndex - 1).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComprehensiveCapitalCard;
