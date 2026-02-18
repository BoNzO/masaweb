import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { calculateMasaDenominator } from '../utils/mathUtils';
import type { MasaPlan } from '../types/masaniello';

interface ComprehensiveCapitalCardProps {
    plan: MasaPlan;
    history: MasaPlan[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-2xl text-[10px]" style={{ minWidth: '120px' }}>
                <p className="font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-700/50 pb-1">{payload[0].payload.name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--txt-secondary)' }}>CAPITALE:</span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>€{payload[0].value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        );
    }
    return null;
};

const ComprehensiveCapitalCard: React.FC<ComprehensiveCapitalCardProps> = ({
    plan,
    history
}) => {
    const profit = plan.currentCapital - plan.startCapital;
    const isProfit = profit >= 0;
    const growthPercent = plan.startCapital > 0 ? (profit / plan.startCapital) * 100 : 0;

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
                        fontSize: '48px',
                        fontWeight: 300,
                        letterSpacing: '-2px',
                        lineHeight: 1,
                        color: 'var(--txt-primary)',
                        marginBottom: '8px'
                    }}>
                        <span style={{
                            fontSize: '24px',
                            verticalAlign: 'top',
                            marginTop: '12px',
                            display: 'inline-block',
                            color: 'var(--txt-secondary)'
                        }}>
                            €
                        </span>
                        {plan.currentCapital.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            {isProfit ? '+' : ''}{growthPercent.toFixed(2)}%
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
                        color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        lineHeight: 1,
                        marginBottom: '8px'
                    }}>
                        {profit >= 0 ? '+' : ''}€{profit.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>
                        Performance Ciclo Corrente
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
                    gridTemplateColumns: '0.8fr 0.8fr 0.8fr 0.8fr 2.1fr',
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
                            color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            gap: '2px'
                        }}>
                            <span style={{ fontSize: '24px', fontWeight: 700 }}>
                                €{Math.floor(Math.abs(profit)).toLocaleString('it-IT')}
                            </span>
                            <span style={{ fontSize: '14px', opacity: 0.6 }}>
                                ,{Math.round((Math.abs(profit) % 1) * 100).toString().padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: '16px', opacity: 0.3, margin: '0 8px' }}>/</span>
                            <span style={{ fontSize: '22px', color: 'var(--accent-green)', fontWeight: 800 }}>
                                €{(plan.targetCapital - plan.startCapital).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="stat-label-redesign" style={{ color: 'var(--accent-green)', opacity: 0.7 }}>TARGET PROFIT</div>
                    </div>
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
