import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { MasanielloInstance } from '../types/masaniello';
import { useMasaniello } from '../hooks/useMasaniello';
import { calculateStake, calculateTwinHealth } from '../utils/masaLogic';
import { TrendingUp, Check, X, Shuffle, ArrowRightLeft, CircleDot, Shield, Lock, PieChart, TrendingDown, Zap, AlertCircle, AreaChart as ChartIcon, Save, Link } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import HistoryLog from './HistoryLog';

interface TwinMasanielloViewProps {
    instance: MasanielloInstance;
    onUpdate: (updates: Partial<MasanielloInstance>) => void;
    onSaveLog?: (plan: any) => void;
}

const TwinMasanielloView: React.FC<TwinMasanielloViewProps> = ({ instance, onUpdate, onSaveLog }) => {
    const twinState = instance.twinState;

    const masaLong = useMasaniello(false);
    const masaShort = useMasaniello(false);

    const isInternalUpdating = useRef(false);

    const [transferModal, setTransferModal] = useState<'LONG_TO_SHORT' | 'SHORT_TO_LONG' | null>(null);
    const [transferAmount, setTransferAmount] = useState<number | ''>('');
    const [recoveryPending, setRecoveryPending] = useState<{ from: 'LONG' | 'SHORT', amount: number } | null>(null);
    const [hedgePending, setHedgePending] = useState<'LONG' | 'SHORT' | null>(null);
    const [lockNotification, setLockNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [noteLong, setNoteLong] = useState('');
    const [noteShort, setNoteShort] = useState('');
    const [lockInput, setLockInput] = useState<{ side: 'LONG' | 'SHORT', value: number | '' } | null>(null);

    // NEW: Session states for atomic resolution (Hedge + Main)
    const [longSession, setLongSession] = useState<{ main: boolean | null, hedge: boolean | null } | null>(null);
    const [shortSession, setShortSession] = useState<{ main: boolean | null, hedge: boolean | null } | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

    useEffect(() => {
        if (lockNotification) {
            const timer = setTimeout(() => setLockNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [lockNotification]);

    useEffect(() => {
        if (!twinState || isInternalUpdating.current) return;

        // Sync Long
        masaLong.setConfig({
            ...instance.config,
            quota: instance.config.twinConfig?.quotaLong || instance.config.quota,
            totalEvents: instance.config.twinConfig?.totalEventsLong || instance.config.totalEvents,
            expectedWins: instance.config.twinConfig?.expectedWinsLong || instance.config.expectedWins,
        });
        masaLong.setPlans({ [twinState.planLong.id]: twinState.planLong });
        masaLong.setActivePlanId(String(twinState.planLong.id));
        masaLong.setHistory(twinState.historyLong || []);

        // Sync Short
        masaShort.setConfig({
            ...instance.config,
            quota: instance.config.twinConfig?.quotaShort || instance.config.quota,
            totalEvents: instance.config.twinConfig?.totalEventsShort || instance.config.totalEvents,
            expectedWins: instance.config.twinConfig?.expectedWinsShort || instance.config.expectedWins,
        });
        masaShort.setPlans({ [twinState.planShort.id]: twinState.planShort });
        masaShort.setActivePlanId(String(twinState.planShort.id));
        masaShort.setHistory(twinState.historyShort || []);
    }, [instance]);

    // Track the last known lengths to avoid duplicating history on remount
    const prevHistoryLengths = useRef({ long: twinState?.historyLong?.length || 0, short: twinState?.historyShort?.length || 0 });

    useEffect(() => {
        if (!twinState) return;
        // Keep ref in sync with source of truth on mount
        prevHistoryLengths.current = {
            long: twinState.historyLong?.length || 0,
            short: twinState.historyShort?.length || 0
        };
    }, []); // Only on mount

    useEffect(() => {
        if (!twinState) return;
        const currentLong = masaLong.currentPlan;
        const currentShort = masaShort.currentPlan;
        const historyLong = masaLong.history;
        const historyShort = masaShort.history;

        const lChanged = currentLong?.updatedAt !== twinState.planLong?.updatedAt ||
            currentLong?.events.length !== twinState.planLong?.events.length ||
            currentLong?.currentCapital !== twinState.planLong?.currentCapital;

        const sChanged = currentShort?.updatedAt !== twinState.planShort?.updatedAt ||
            currentShort?.events.length !== twinState.planShort?.events.length ||
            currentShort?.currentCapital !== twinState.planShort?.currentCapital;

        const hasOutwardChange = lChanged || sChanged ||
            (masaLong.history.length !== (twinState.historyLong?.length || 0)) ||
            (masaShort.history.length !== (twinState.historyShort?.length || 0));

        const hasHistoryChange = historyLong.length !== (twinState.historyLong?.length || 0) ||
            historyShort.length !== (twinState.historyShort?.length || 0);

        if (hasOutwardChange || hasHistoryChange) {
            isInternalUpdating.current = true;

            // Only push to global history when there's a genuinely NEW completion
            // (compare against the ref, not against the twinState which might be stale during remount)
            let newGlobalHistory = [...instance.history];
            const prevLong = prevHistoryLengths.current.long;
            const prevShort = prevHistoryLengths.current.short;

            if (historyLong.length > prevLong) {
                const completedPlan = historyLong[historyLong.length - 1];
                newGlobalHistory.push({ ...completedPlan, tags: [...(completedPlan.tags || []), 'LONG'] });
                prevHistoryLengths.current.long = historyLong.length;
            }
            if (historyShort.length > prevShort) {
                const completedPlan = historyShort[historyShort.length - 1];
                newGlobalHistory.push({ ...completedPlan, tags: [...(completedPlan.tags || []), 'SHORT'] });
                prevHistoryLengths.current.short = historyShort.length;
            }

            onUpdate({
                history: newGlobalHistory,
                twinState: {
                    ...twinState,
                    planLong: currentLong || twinState.planLong,
                    planShort: currentShort || twinState.planShort,
                    historyLong: historyLong,
                    historyShort: historyShort
                }
            });

            setTimeout(() => {
                isInternalUpdating.current = false;
            }, 50);
        }
    }, [masaLong.currentPlan, masaShort.currentPlan, masaLong.history, masaShort.history]);


    if (!twinState) return <div>Errore Caricamento Twin</div>;

    const currentLong = twinState.planLong;
    const currentShort = twinState.planShort;

    const quotaLong = currentLong.quota;
    const quotaShort = currentShort.quota;

    const mLong = currentLong.maxConsecutiveLosses || 0;
    const winsLong = currentLong.expectedWins - currentLong.remainingWins;
    const lossesLong = (currentLong.totalEvents - currentLong.remainingEvents) - winsLong;
    const eventsPlayedLong = currentLong.totalEvents - currentLong.remainingEvents;

    const mShort = currentShort.maxConsecutiveLosses || 0;
    const winsShort = currentShort.expectedWins - currentShort.remainingWins;
    const lossesShort = (currentShort.totalEvents - currentShort.remainingEvents) - winsShort;
    const eventsPlayedShort = currentShort.totalEvents - currentShort.remainingEvents;

    // PERFORMANCE: Memoize history display - include events from ALL past completed plans + current plan
    const displayHistoryLong = useMemo(() => {
        const pastEvents = (twinState?.historyLong || []).flatMap(p => p.events.filter((e: any) => !e.isSystemLog));
        const currentEvents = currentLong.events.filter(e => !e.isSystemLog);
        return [...pastEvents, ...currentEvents].reverse();
    }, [currentLong.events, twinState?.historyLong]);

    const displayHistoryShort = useMemo(() => {
        const pastEvents = (twinState?.historyShort || []).flatMap(p => p.events.filter((e: any) => !e.isSystemLog));
        const currentEvents = currentShort.events.filter(e => !e.isSystemLog);
        return [...pastEvents, ...currentEvents].reverse();
    }, [currentShort.events, twinState?.historyShort]);

    const twinHealth = useMemo(() => calculateTwinHealth(currentLong, currentShort), [currentLong, currentShort]);

    const elastic = instance.config.elasticConfig;
    const isElasticLongTriggered = !!(elastic?.enabled &&
        (currentLong.currentConsecutiveLosses || 0) >= elastic.triggerOnLosses &&
        (currentLong.elasticStretchesUsed || 0) < elastic.maxStretches);

    const isElasticShortTriggered = !!(elastic?.enabled &&
        (currentShort.currentConsecutiveLosses || 0) >= elastic.triggerOnLosses &&
        (currentShort.elasticStretchesUsed || 0) < elastic.maxStretches);

    const stakeLong = calculateStake(currentLong.currentCapital, currentLong.remainingEvents, currentLong.remainingWins, quotaLong, currentLong.targetCapital, mLong, currentLong.currentConsecutiveLosses || 0);
    const stakeShort = calculateStake(currentShort.currentCapital, currentShort.remainingEvents, currentShort.remainingWins, quotaShort, currentShort.targetCapital, mShort, currentShort.currentConsecutiveLosses || 0);

    const handleOutcomeLong = (isWin: boolean, isHedge: boolean = false) => {
        if (currentLong.status !== 'active') return;

        // If a session is active (Hedge opened), we only track the outcome for now
        if (longSession && !isHedge) {
            setLongSession(prev => ({ ...prev!, main: isWin }));
            return;
        }

        // Suggest manual recovery after a win if Short is in trouble
        if (isWin && !isHedge && currentShort.currentConsecutiveLosses && currentShort.currentConsecutiveLosses >= (mShort * 0.7)) {
            const recoveryBudget = Math.floor(Math.min(stakeLong * 0.3, currentLong.currentCapital * 0.05));
            if (currentLong.currentCapital > currentLong.startCapital + recoveryBudget) {
                setRecoveryPending({ from: 'LONG', amount: recoveryBudget });
            }
        }

        masaLong.handleFullBet(isWin, quotaLong, undefined, undefined, 0, isHedge, false, noteLong);
        setNoteLong('');
    };

    const handleOutcomeShort = (isWin: boolean, isHedge: boolean = false) => {
        if (currentShort.status !== 'active') return;

        // If a session is active (Hedge opened), we only track the outcome for now
        if (shortSession && !isHedge) {
            setShortSession(prev => ({ ...prev!, main: isWin }));
            return;
        }

        // Suggest manual recovery after a win if Long is in trouble
        if (isWin && !isHedge && currentLong.currentConsecutiveLosses && currentLong.currentConsecutiveLosses >= (mLong * 0.7)) {
            const recoveryBudget = Math.floor(Math.min(stakeShort * 0.3, currentShort.currentCapital * 0.05));
            if (currentShort.currentCapital > currentShort.startCapital + recoveryBudget) {
                setRecoveryPending({ from: 'SHORT', amount: recoveryBudget });
            }
        }

        masaShort.handleFullBet(isWin, quotaShort, undefined, undefined, 0, isHedge, false, noteShort);
        setNoteShort('');
    };

    const handleApproveRecovery = () => {
        if (!recoveryPending) return;

        const { from, amount } = recoveryPending;
        isInternalUpdating.current = true;

        if (from === 'LONG') {
            // Deduct from Long
            const updatedLong = { ...currentLong, currentCapital: currentLong.currentCapital - amount };
            masaLong.setPlans({ [updatedLong.id]: updatedLong });
            // Add to Short as surplus
            masaShort.handleFullBet(true, quotaShort, 'SMART RECOVERY (MANUAL)', {}, amount);
        } else {
            // Deduct from Short
            const updatedShort = { ...currentShort, currentCapital: currentShort.currentCapital - amount };
            masaShort.setPlans({ [updatedShort.id]: updatedShort });
            // Add to Long as surplus
            masaLong.handleFullBet(true, quotaLong, 'SMART RECOVERY (MANUAL)', {}, amount);
        }

        setRecoveryPending(null);
        setTimeout(() => isInternalUpdating.current = false, 50);
    };

    const handleHedge = (side: 'LONG' | 'SHORT') => {
        setHedgePending(side);
        if (side === 'LONG') setLongSession({ main: null, hedge: null });
        else setShortSession({ main: null, hedge: null });
    };

    const handleHedgeOutcome = (isWin: boolean) => {
        if (!hedgePending) return;
        if (hedgePending === 'LONG') {
            setLongSession(prev => ({ ...prev!, hedge: isWin }));
        } else {
            setShortSession(prev => ({ ...prev!, hedge: isWin }));
        }
    };

    const cancelHedgeMode = (side: 'LONG' | 'SHORT') => {
        setHedgePending(null);
        if (side === 'LONG') setLongSession(null);
        else setShortSession(null);
    };

    // Auto-resolve when both outcomes are set
    useEffect(() => {
        if (longSession && longSession.main !== null && longSession.hedge !== null) {
            const hOutcome = longSession.hedge;
            const mOutcome = longSession.main;
            const q = quotaLong;

            setLongSession(null);
            setHedgePending(null);

            // 2. Use the atomic handler
            masaLong.handleHedgedBet(hOutcome, mOutcome, q, undefined, 'HEDGE SESSION', undefined, noteLong);
            setNoteLong('');
        }
    }, [longSession, quotaLong, masaLong, noteLong]);

    useEffect(() => {
        if (shortSession && shortSession.main !== null && shortSession.hedge !== null) {
            const hOutcome = shortSession.hedge;
            const mOutcome = shortSession.main;
            const q = quotaShort;

            setShortSession(null);
            setHedgePending(null);

            masaShort.handleHedgedBet(hOutcome, mOutcome, q, undefined, 'HEDGE SESSION', undefined, noteShort);
            setNoteShort('');
        }
    }, [shortSession, quotaShort, masaShort, noteShort]);

    const handleLockProfit = (side: 'LONG' | 'SHORT') => {
        setLockInput({ side, value: '' });
    };

    const handleLockSubmit = () => {
        if (!lockInput || lockInput.value === '' || lockInput.value <= 0) {
            setLockInput(null);
            return;
        }

        const { side, value: lockAmount } = lockInput;
        const hook = side === 'LONG' ? masaLong : masaShort;

        const updatedMasa = hook.lockProfit(Number(lockAmount));

        if (!updatedMasa) {
            setLockNotification({
                message: `Impossibile prelevare €${lockAmount}: supera il capitale attuale.`,
                type: 'error'
            });
            setLockInput(null);
            return;
        }

        const newSnapshots = [...(twinState.snapshots || []), {
            timestamp: new Date().toISOString(),
            side,
            capitalLocked: Number(lockAmount)
        }];

        const updatedState = {
            ...twinState,
            planLong: side === 'LONG' ? updatedMasa : twinState.planLong,
            planShort: side === 'SHORT' ? updatedMasa : twinState.planShort,
            snapshots: newSnapshots
        };

        onUpdate({ twinState: updatedState });

        setLockNotification({
            message: `€${lockAmount} prelevati dal ramo ${side}! Obiettivo e stake ricalcolati.`,
            type: 'success'
        });
        setLockInput(null);
    };

    const handleTransfer = () => {
        const amount = Number(transferAmount);
        if (!transferModal || amount <= 0) return;

        isInternalUpdating.current = true;

        const newLongCap = transferModal === 'LONG_TO_SHORT'
            ? currentLong.currentCapital - amount
            : currentLong.currentCapital + amount;

        const newShortCap = transferModal === 'SHORT_TO_LONG'
            ? currentShort.currentCapital - amount
            : currentShort.currentCapital + amount;

        const updatedLong = { ...currentLong, currentCapital: newLongCap };
        const updatedShort = { ...currentShort, currentCapital: newShortCap };

        onUpdate({
            twinState: {
                ...twinState,
                planLong: updatedLong,
                planShort: updatedShort
            }
        });

        masaLong.setPlans({ [updatedLong.id]: updatedLong });
        masaShort.setPlans({ [updatedShort.id]: updatedShort });

        setTransferModal(null);
        setTransferAmount('');

        setTimeout(() => {
            isInternalUpdating.current = false;
        }, 50);
    };

    const originLongCap = twinState?.historyLong && twinState.historyLong.length > 0
        ? twinState.historyLong[0].startCapital
        : (instance.config?.twinConfig?.capitalLong || (instance.absoluteStartCapital / 2));

    const originShortCap = twinState?.historyShort && twinState.historyShort.length > 0
        ? twinState.historyShort[0].startCapital
        : (instance.config?.twinConfig?.capitalShort || (instance.absoluteStartCapital / 2));

    const profitLong = currentLong.currentCapital - originLongCap;
    const profitShort = currentShort.currentCapital - originShortCap;
    const netProfit = profitLong + profitShort;

    const totalInitial = originLongCap + originShortCap;
    const totalCurrent = totalInitial + netProfit;

    const getIntegratedChartData = () => {
        if (!twinState) return [];

        // 1. Current Ongoing Plans
        const longEvents = currentLong.events.filter(e => !e.isSystemLog).map(e => ({ ...e, side: 'LONG' }));
        const shortEvents = currentShort.events.filter(e => !e.isSystemLog).map(e => ({ ...e, side: 'SHORT' }));

        // 2. Past Completed Plans
        const pastLongEvents = (twinState.historyLong || []).map(p => p.events.filter(e => !e.isSystemLog).map(e => ({ ...e, side: 'LONG' }))).flat();
        const pastShortEvents = (twinState.historyShort || []).map(p => p.events.filter(e => !e.isSystemLog).map(e => ({ ...e, side: 'SHORT' }))).flat();

        const combinedPastEvents = [...pastLongEvents, ...pastShortEvents].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const allEventsSorted = [...combinedPastEvents, ...longEvents, ...shortEvents].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let curLongCap = originLongCap;
        let curShortCap = originShortCap;

        let cumulativeLocked = 0;

        const data: any[] = [{
            name: 'Start',
            long: curLongCap,
            short: curShortCap,
            combined: curLongCap + curShortCap,
            locked: 0,
            timestamp: instance.createdAt || new Date().toISOString()
        }];

        const snapshots = (twinState.snapshots || []).map(s => ({ ...s, isSnapshot: true }));
        const merged = [...allEventsSorted, ...snapshots].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        merged.forEach((item, index) => {
            if ('capitalAfter' in item) {
                if ((item as any).side === 'LONG') {
                    curLongCap = (item as any).capitalAfter;
                } else {
                    curShortCap = (item as any).capitalAfter;
                }
            } else if ((item as any).isSnapshot) {
                cumulativeLocked += (item as any).capitalLocked;
            }

            data.push({
                name: `${index + 1}`,
                long: Math.round(curLongCap),
                short: Math.round(curShortCap),
                combined: Math.round(curLongCap + curShortCap + cumulativeLocked),
                locked: Math.round(cumulativeLocked),
                timestamp: item.timestamp
            });
        });

        // Limit data points for performance if very long
        if (data.length > 50) {
            const step = Math.ceil(data.length / 50);
            return data.filter((_, i) => i % step === 0 || i === data.length - 1);
        }

        return data;
    };

    const TwinTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0f1623] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 pb-2 border-b border-white/5">
                        Dettaglio Evento {payload[0].payload.name}
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[10px] text-blue-400 font-black uppercase">Equity Long</span>
                            <span className="text-white font-bold">€{payload.find((p: any) => p.dataKey === 'long')?.value}</span>
                        </div>
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[10px] text-purple-400 font-black uppercase">Equity Short</span>
                            <span className="text-white font-bold">€{payload.find((p: any) => p.dataKey === 'short')?.value}</span>
                        </div>
                        <div className="flex justify-between items-center gap-6 pt-2 border-t border-white/10">
                            <span className="text-[10px] text-emerald-400 font-black uppercase">Integrata (L+S)</span>
                            <span className="text-emerald-400 font-black">€{payload.find((p: any) => p.dataKey === 'combined')?.value}</span>
                        </div>
                        {payload[0].payload.locked > 0 && (
                            <div className="flex justify-between items-center gap-6">
                                <span className="text-[10px] text-amber-500 font-black uppercase">Profitti Locked</span>
                                <span className="text-amber-500 font-bold">€{payload[0].payload.locked}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const chartData = getIntegratedChartData();

    return (
        <div className="flex flex-col gap-6 animate-fade-in" style={{ gridColumn: '1 / -1' }}>

            <div className="p-8 rounded-3xl relative overflow-hidden transition-all duration-500 shadow-2xl border bg-gradient-to-br from-[#0f1623] to-[#181c21] border-white/5">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50"></div>

                <div className="flex items-center justify-between mb-8 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/5 text-white rounded-xl backdrop-blur-md">
                            <Shuffle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest">Masa Twin</h2>
                            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-1">Isolamento Direzionale</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Masa Chiusi</div>
                        <div className="bg-black/30 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mt-0.5"></div>
                            <span className="text-sm font-black text-cyan-50">{instance.history.length}</span>
                        </div>
                    </div>
                </div>

                {/* Total Capital - Center */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center mt-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                        Bilancio Globale (L+S)
                        <div title="Masa Health Index (Twin Aggregato)" className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black tracking-tighter transition-all ${twinHealth.score > 70 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' :
                            twinHealth.score > 40 ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                                'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}>
                            <Shield size={8} /> MHI: {twinHealth.score}%
                        </div>
                    </div>
                    <div className="flex items-end gap-3">
                        <div className="text-3xl font-black text-white">
                            €{Math.ceil(totalCurrent).toLocaleString('it-IT')}
                        </div>
                        <div className={`text-sm font-bold mb-1 ${netProfit > 0 ? 'text-emerald-400' : netProfit < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {netProfit > 0 ? '+' : ''}€{Math.ceil(netProfit).toLocaleString('it-IT')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Area */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-8 pointer-events-none">
                {lockNotification && (
                    <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto ${lockNotification.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                        <div className={`p-2 rounded-lg ${lockNotification.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                            {lockNotification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div className="text-xs font-black uppercase tracking-widest flex-1">
                            {lockNotification.message}
                        </div>
                        <button onClick={() => setLockNotification(null)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Smart Recovery Suggestion Banner */}
            {recoveryPending && (
                <div className="mx-8 mt-2 mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                            <Zap size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-black text-white uppercase tracking-widest">Suggerimento Smart Recovery</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                {recoveryPending.from === 'LONG'
                                    ? `Usa €${recoveryPending.amount} del profitto LONG per aiutare SHORT (in Red Line)`
                                    : `Usa €${recoveryPending.amount} del profitto SHORT per aiutare LONG (in Red Line)`}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setRecoveryPending(null)}
                            className="px-4 py-2 hover:bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors"
                        >
                            Ignora
                        </button>
                        <button
                            onClick={handleApproveRecovery}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-500/10"
                        >
                            Approva
                        </button>
                    </div>
                </div>
            )}

            {/* Elastic Horizon Banners */}
            {isElasticLongTriggered && (
                <div className="mx-8 mt-2 mb-6 p-4 bg-indigo-900/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                            <Shield size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-black text-white uppercase tracking-widest">Elastic Horizon: Masa Long</div>
                            <div className="text-[10px] text-indigo-200/70 font-bold uppercase mt-0.5">
                                Rilevato Drawdown. Estendi l'orizzonte (Stretch {(currentLong.elasticStretchesUsed || 0) + 1}/{elastic?.maxStretches || 0}).
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => masaLong.activateElasticHorizon()}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Attiva Estensione
                    </button>
                </div>
            )}

            {isElasticShortTriggered && (
                <div className="mx-8 mt-2 mb-6 p-4 bg-indigo-900/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                            <Shield size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-black text-white uppercase tracking-widest">Elastic Horizon: Masa Short</div>
                            <div className="text-[10px] text-indigo-200/70 font-bold uppercase mt-0.5">
                                Rilevato Drawdown. Estendi l'orizzonte (Stretch {(currentShort.elasticStretchesUsed || 0) + 1}/{elastic?.maxStretches || 0}).
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => masaShort.activateElasticHorizon()}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Attiva Estensione
                    </button>
                </div>
            )}

            {/* Centralized Configuration */}
            <div className="flex flex-wrap items-center justify-center gap-4 bg-black/20 rounded-2xl p-4 border border-white/5 mb-2 mx-auto w-full md:w-fit relative z-10 -mt-6">
                <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Quota:</span>
                    <span className="text-sm font-bold text-white">
                        {quotaLong === quotaShort ? (
                            `@${quotaLong.toFixed(2)}`
                        ) : (
                            <span className="flex gap-2">
                                <span className="text-blue-400">@{quotaLong.toFixed(2)}</span>
                                <span className="text-slate-600">|</span>
                                <span className="text-purple-400">@{quotaShort.toFixed(2)}</span>
                            </span>
                        )}
                    </span>
                </div>
                <div className="w-px h-4 bg-white/10 hidden md:block"></div>
                <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Eventi:</span>
                    <span className="text-sm font-bold text-white">
                        {currentLong.totalEvents === currentShort.totalEvents ? (
                            currentLong.totalEvents
                        ) : (
                            <span className="flex gap-2">
                                <span className="text-blue-400">{currentLong.totalEvents}</span>
                                <span className="text-slate-600">|</span>
                                <span className="text-purple-400">{currentShort.totalEvents}</span>
                            </span>
                        )}
                    </span>
                </div>
                <div className="w-px h-4 bg-white/10 hidden md:block"></div>
                <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Attese:</span>
                    <span className="text-sm font-bold text-white">
                        {currentLong.expectedWins === currentShort.expectedWins ? (
                            currentLong.expectedWins
                        ) : (
                            <span className="flex gap-2">
                                <span className="text-blue-400">{currentLong.expectedWins}</span>
                                <span className="text-slate-600">|</span>
                                <span className="text-purple-400">{currentShort.expectedWins}</span>
                            </span>
                        )}
                    </span>
                </div>
                <div className="w-px h-4 bg-white/10 hidden md:block"></div>
                <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Red Line:</span>
                    <span className="text-sm font-bold text-white">
                        {mLong === mShort ? (
                            mLong > 0 ? mLong : 'N/A'
                        ) : (
                            <span className="flex gap-2">
                                <span className="text-blue-400">{mLong}</span>
                                <span className="text-slate-600">|</span>
                                <span className="text-purple-400">{mShort}</span>
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {/* Summary Cards: aggregated + per-twin breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 mb-6 relative z-20">
                {/* CAPITALE INIZIALE */}
                <div className="bg-[#111823]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-xl transition-all hover:border-white/10 group">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.22em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">CAPITALE INIZIALE</div>
                    <div className="text-4xl font-black text-white mb-6 flex items-baseline gap-1">
                        <span className="text-2xl opacity-50 font-medium">€</span>
                        {Math.ceil(totalInitial).toLocaleString('it-IT')}
                    </div>
                    <div className="h-px bg-white/5 mb-6"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">LONG</div>
                            <div className="text-base font-black text-blue-400">€{Math.ceil(originLongCap).toLocaleString('it-IT')}</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">SHORT</div>
                            <div className="text-base font-black text-pink-400">€{Math.ceil(originShortCap).toLocaleString('it-IT')}</div>
                        </div>
                    </div>
                </div>

                {/* OBIETTIVO TARGET */}
                <div className="bg-[#111823]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-xl transition-all hover:border-white/10 group">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.22em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">OBIETTIVO TARGET</div>
                    <div className="text-4xl font-black text-white mb-6 flex items-baseline gap-1">
                        <span className="text-2xl opacity-50 font-medium">€</span>
                        {Math.ceil(currentLong.targetCapital + currentShort.targetCapital).toLocaleString('it-IT')}
                    </div>
                    <div className="h-px bg-white/5 mb-6"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">LONG</div>
                            <div className="text-base font-black text-blue-400">€{Math.ceil(currentLong.targetCapital).toLocaleString('it-IT')}</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">SHORT</div>
                            <div className="text-base font-black text-pink-400">€{Math.ceil(currentShort.targetCapital).toLocaleString('it-IT')}</div>
                        </div>
                    </div>
                </div>

                {/* UTILE NETTO */}
                <div className="bg-[#111823]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-xl transition-all hover:border-white/10 group">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.22em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">UTILE NETTO</div>
                    <div className={`text-4xl font-black mb-6 flex items-baseline gap-1 ${netProfit > 0 ? 'text-emerald-400' : netProfit < 0 ? 'text-rose-400' : 'text-white'}`}>
                        <span className="text-2xl opacity-50 font-medium">€</span>
                        {Math.ceil(netProfit).toLocaleString('it-IT')}
                    </div>
                    <div className="h-px bg-white/5 mb-6"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">LONG</div>
                            <div className={`text-base font-black ${profitLong > 0 ? 'text-emerald-400' : profitLong < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {profitLong > 0 ? '+' : ''}€{Math.ceil(profitLong).toLocaleString('it-IT')}
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">SHORT</div>
                            <div className={`text-base font-black ${profitShort > 0 ? 'text-emerald-400' : profitShort < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {profitShort > 0 ? '+' : ''}€{Math.ceil(profitShort).toLocaleString('it-IT')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PERFORMANCE */}
                <div className="bg-[#111823]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-xl transition-all hover:border-white/10 group">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.22em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">PERFORMANCE</div>
                    <div className={`text-4xl font-black mb-6 ${netProfit > 0 ? 'text-amber-400' : netProfit < 0 ? 'text-rose-400' : 'text-white'}`}>
                        {totalInitial > 0 ? ((netProfit / totalInitial) * 100).toFixed(0) : '0'}%
                    </div>
                    <div className="h-px bg-white/5 mb-6"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">LONG</div>
                            <div className={`text-base font-black ${profitLong > 0 ? 'text-emerald-400' : profitLong < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {originLongCap > 0 ? Math.round(((profitLong / originLongCap) * 100)) : '0'}%
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 opacity-40">SHORT</div>
                            <div className={`text-base font-black ${profitShort > 0 ? 'text-emerald-400' : profitShort < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {originShortCap > 0 ? Math.round(((profitShort / originShortCap) * 100)) : '0'}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* MASA LONG */}
                <div className={`flex flex-col p-6 rounded-2xl border ${currentLong.status === 'active' ? 'bg-gradient-to-br from-blue-900/10 to-blue-900/5 border-blue-500/20' : 'bg-black/20 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-blue-400">
                                <TrendingUp size={16} />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Masa Long</span>
                            </div>

                            <div className="flex items-center gap-2 px-2 py-0.5 bg-black/40 rounded border border-white/5">
                                <div className="flex items-center gap-1">
                                    <span className="text-[6px] text-slate-600 font-black uppercase tracking-widest">Quota</span>
                                    <span className="text-[8px] font-black text-slate-300">@{quotaLong.toFixed(2)}</span>
                                </div>
                                <div className="w-px h-2 bg-white/5"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[6px] text-slate-600 font-black uppercase tracking-widest">Eventi</span>
                                    <span className="text-[8px] font-black text-slate-300">{currentLong.totalEvents}</span>
                                </div>
                                <div className="w-px h-2 bg-white/5"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[6px] text-slate-600 font-black uppercase tracking-widest">Attese</span>
                                    <span className="text-[8px] font-black text-slate-300">{currentLong.expectedWins}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Status:</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                                <span className="text-[8px] font-black text-emerald-400/80 uppercase tracking-widest">Active</span>
                                <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"></div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Suggested Stake</div>
                        <div className="text-4xl font-['DM_Sans'] font-black text-white flex items-center justify-center gap-2">
                            <span className="text-2xl text-slate-500">€</span>{Math.ceil(stakeLong).toLocaleString('it-IT')}
                        </div>
                    </div>

                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => handleOutcomeLong(true)}
                            disabled={currentLong.status !== 'active'}
                            className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${longSession?.main === true
                                ? 'bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                        >
                            <Check size={16} /> Win
                        </button>
                        <button
                            onClick={() => masaLong.handleBreakEven()}
                            disabled={currentLong.status !== 'active' || !!longSession}
                            className="flex-1 py-3.5 bg-slate-800/50 border border-white/5 hover:bg-slate-700/50 text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                            <CircleDot size={16} /> B.E.
                        </button>
                        <button
                            onClick={() => handleOutcomeLong(false)}
                            disabled={currentLong.status !== 'active'}
                            className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${longSession?.main === false
                                ? 'bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                }`}
                        >
                            <X size={16} /> Loss
                        </button>
                    </div>

                    {/* Note Input Long */}
                    <div className="mb-3 px-1">
                        <textarea
                            value={noteLong}
                            onChange={(e) => setNoteLong(e.target.value)}
                            placeholder="Nota diario per Masa Long..."
                            className="w-full min-h-[42px] bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-blue-500/30 transition-all resize-none shadow-inner"
                        />
                    </div>

                    {/* Hedge & Lock Controls Long */}
                    <div className="flex flex-col gap-2 mb-6">
                        {hedgePending === 'LONG' ? (
                            <div className="flex flex-col gap-4 p-5 bg-blue-500/5 border border-blue-500/20 rounded-[22px] animate-in fade-in zoom-in duration-200">
                                <div className="flex flex-col items-center">
                                    <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest text-center">Hedge Configuration</div>
                                    <div className="text-[10px] text-white font-bold mt-2 bg-blue-500/20 px-4 py-1.5 rounded-full border border-blue-500/30">
                                        STAKE HEDGE: €{(instance.config.hedgeQuota && instance.config.hedgeQuota > 1
                                            ? stakeLong / (instance.config.hedgeQuota - 1)
                                            : stakeLong / (3.0 - 1)).toLocaleString('it-IT')}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 text-center">1. Esito Copertura (Short)</div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleHedgeOutcome(true)}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${longSession?.hedge === true ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                                            >
                                                Vinto
                                            </button>
                                            <button
                                                onClick={() => handleHedgeOutcome(false)}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${longSession?.hedge === false ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
                                            >
                                                Perso
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-white/5 text-center">
                                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">2. Esito Trade Principale</div>
                                        <div className="text-[8px] text-blue-400/70 italic">(Usa i tasti sopra)</div>
                                    </div>

                                    <button
                                        onClick={() => cancelHedgeMode('LONG')}
                                        className="w-full py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                    >
                                        Annulla Hedge
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center px-4">
                                <button
                                    onClick={() => handleHedge('LONG')}
                                    className="flex items-center gap-2 text-[10px] font-black text-blue-400/80 hover:text-blue-400 uppercase tracking-widest transition-colors"
                                >
                                    <Link size={14} className="opacity-70" /> Hedge Short
                                </button>

                                {lockInput?.side === 'LONG' ? (
                                    <div className="flex gap-2 animate-in slide-in-from-right-2">
                                        <input
                                            type="number"
                                            value={lockInput.value}
                                            onChange={(e) => setLockInput({ ...lockInput, value: e.target.value === '' ? '' : Number(e.target.value) })}
                                            placeholder="€"
                                            className="w-20 bg-black/40 border border-amber-500/30 rounded-lg px-2 py-1 text-[10px] font-bold text-amber-400 outline-none"
                                        />
                                        <button onClick={handleLockSubmit} className="text-amber-500 hover:text-amber-400"><Check size={16} /></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleLockProfit('LONG')}
                                        className="flex items-center gap-2 text-[10px] font-black text-amber-500/80 hover:text-amber-500 uppercase tracking-widest transition-colors"
                                    >
                                        <Lock size={14} className="opacity-70" /> Lock Profit
                                    </button>
                                )}
                            </div>
                        )}
                    </div>



                    <div className="bg-[#141d2e] border border-white/5 rounded-[22px] p-5 shadow-2xl relative overflow-hidden">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Active Stats</div>

                        <div className="flex items-center justify-between mb-8 px-2">
                            <div className="flex flex-col items-center">
                                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Capitale Attuale</div>
                                <div className="text-2xl font-black text-white">€{Math.ceil(currentLong.currentCapital).toLocaleString('it-IT')}</div>
                                <div className="flex gap-1.5 mt-2">
                                    <div className="text-[7px] text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">INS: €4700</div>
                                    <div className="text-[7px] text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">CO</div>
                                </div>
                            </div>

                            <div className="relative w-24 h-24">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent"
                                        strokeDasharray={2 * Math.PI * 40}
                                        strokeDashoffset={2 * Math.PI * 40 * (1 - Math.max(0, Math.min(1, (currentLong.currentCapital - currentLong.startCapital) / (currentLong.targetCapital - currentLong.startCapital))))}
                                        className="text-blue-500" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[9px] font-black text-white tracking-widest leading-none">Reached %</span>
                                    <span className="text-[11px] font-black text-blue-400 mt-0.5">{Math.max(0, Math.round(((currentLong.currentCapital - currentLong.startCapital) / (currentLong.targetCapital - currentLong.startCapital)) * 100))}%</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Capitale Target</div>
                                <div className="text-2xl font-black text-blue-400">€{Math.ceil(currentLong.targetCapital).toLocaleString('it-IT')}</div>
                                <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                                    Raggiunto: {Math.max(0, Math.round(((currentLong.currentCapital - currentLong.startCapital) / (currentLong.targetCapital - currentLong.startCapital)) * 100))}%
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                    <ChartIcon size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Vittorie</span>
                                    <div className="text-xs font-black text-white">{winsLong} <span className="text-slate-600">/ {currentLong.expectedWins}</span></div>
                                </div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                                    <X size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Perdite</span>
                                    <div className="text-xs font-black text-white">{lossesLong} <span className="text-slate-600">/ {currentLong.totalEvents - currentLong.expectedWins}</span></div>
                                </div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <TrendingUp size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Red Line</span>
                                    <div className="text-xs font-black text-white">{currentLong.currentConsecutiveLosses} <span className="text-slate-600">/ {mLong || '-'}</span></div>
                                </div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
                                    <PieChart size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Eventi Giocati</span>
                                    <div className="text-xs font-black text-white">{eventsPlayedLong} <span className="text-slate-600">/ {currentLong.totalEvents}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Transfer TO Short */}
                    <div className="mt-4 border-t border-white/5 pt-4">
                        <button
                            onClick={() => setTransferModal('LONG_TO_SHORT')}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowRightLeft size={12} /> Trasferisci a Short
                        </button>
                    </div>

                    {/* Long History */}
                    {displayHistoryLong.length > 0 && (
                        <div className="mt-6 border-t border-white/5 pt-4">
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Storico Trade Long</h4>
                            <div className="max-h-56 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {displayHistoryLong.map((ev: any) => (
                                    <div key={ev.id} className="flex flex-col p-2 rounded-lg bg-black/20 border border-white/5 transition-all hover:bg-black/30">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-black text-[10px] w-5 h-5 rounded flex items-center justify-center ${ev.isVoid ? 'bg-slate-700 text-slate-400' : ev.isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {ev.isWin ? 'W' : (ev.isVoid ? 'V' : 'L')}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                                        Stake: €{ev.stake.toLocaleString('it-IT')}
                                                    </span>
                                                    {(ev.isHedge || ev.note === 'edge') && (
                                                        <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-1 rounded border border-blue-500/20 w-fit">
                                                            EDGE TRADE
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-white">€{Math.ceil(ev.capitalAfter).toLocaleString('it-IT')}</div>
                                            </div>
                                        </div>
                                        {ev.note && ev.note !== 'edge' && (
                                            <div className="w-full mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-500 italic">
                                                {ev.note}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* MASA SHORT */}
                <div className={`flex flex-col p-6 rounded-2xl border ${currentShort.status === 'active' ? 'bg-gradient-to-br from-purple-900/10 to-purple-900/5 border-purple-500/20' : 'bg-black/20 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-purple-400">
                                <TrendingDown size={16} />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Masa Short</span>
                            </div>

                            <div className="flex items-center gap-2 px-2 py-0.5 bg-black/40 rounded border border-white/5">
                                <div className="flex items-center gap-1">
                                    <span className="text-[6px] text-slate-600 font-black uppercase tracking-widest">Quota</span>
                                    <span className="text-[8px] font-black text-purple-300">@{quotaShort.toFixed(2)}</span>
                                </div>
                                <div className="w-px h-2 bg-white/5"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[6px] text-slate-600 font-black uppercase tracking-widest">Eventi</span>
                                    <span className="text-[8px] font-black text-purple-300">{currentShort.totalEvents}</span>
                                </div>
                                <div className="w-px h-2 bg-white/5"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[6px] text-slate-600 font-black uppercase tracking-widest">Attese</span>
                                    <span className="text-[8px] font-black text-purple-300">{currentShort.expectedWins}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Status:</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                                <span className="text-[8px] font-black text-emerald-400/80 uppercase tracking-widest">Active</span>
                                <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"></div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Suggested Stake</div>
                        <div className="text-4xl font-['DM_Sans'] font-black text-white flex items-center justify-center gap-2">
                            <span className="text-2xl text-slate-500">€</span>{Math.ceil(stakeShort).toLocaleString('it-IT')}
                        </div>
                    </div>

                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => handleOutcomeShort(true)}
                            disabled={currentShort.status !== 'active'}
                            className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${shortSession?.main === true
                                ? 'bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                        >
                            <Check size={16} /> Win
                        </button>
                        <button
                            onClick={() => masaShort.handleBreakEven()}
                            disabled={currentShort.status !== 'active' || !!shortSession}
                            className="flex-1 py-3.5 bg-slate-800/50 border border-white/5 hover:bg-slate-700/50 text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                            <CircleDot size={16} /> B.E.
                        </button>
                        <button
                            onClick={() => handleOutcomeShort(false)}
                            disabled={currentShort.status !== 'active'}
                            className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${shortSession?.main === false
                                ? 'bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                }`}
                        >
                            <X size={16} /> Loss
                        </button>
                    </div>

                    {/* Note Input Short */}
                    <div className="mb-3 px-1">
                        <textarea
                            value={noteShort}
                            onChange={(e) => setNoteShort(e.target.value)}
                            placeholder="Nota diario per Masa Short..."
                            className="w-full min-h-[42px] bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-purple-500/30 transition-all resize-none shadow-inner"
                        />
                    </div>

                    {/* Hedge & Lock Controls Short */}
                    <div className="flex flex-col gap-2 mb-6">
                        {hedgePending === 'SHORT' ? (
                            <div className="flex flex-col gap-4 p-5 bg-purple-500/5 border border-purple-500/20 rounded-[22px] animate-in fade-in zoom-in duration-200">
                                <div className="flex flex-col items-center">
                                    <div className="text-[10px] text-purple-400 font-black uppercase tracking-widest text-center">Hedge Configuration</div>
                                    <div className="text-[10px] text-white font-bold mt-2 bg-purple-500/20 px-4 py-1.5 rounded-full border border-purple-500/30">
                                        STAKE HEDGE: €{(instance.config.hedgeQuota && instance.config.hedgeQuota > 1
                                            ? stakeShort / (instance.config.hedgeQuota - 1)
                                            : stakeShort / (3.0 - 1)).toLocaleString('it-IT')}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 text-center">1. Esito Copertura (Long)</div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleHedgeOutcome(true)}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${shortSession?.hedge === true ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                                            >
                                                Vinto
                                            </button>
                                            <button
                                                onClick={() => handleHedgeOutcome(false)}
                                                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${shortSession?.hedge === false ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'}`}
                                            >
                                                Perso
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-white/5 text-center">
                                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">2. Esito Trade Principale</div>
                                        <div className="text-[8px] text-purple-400/70 italic">(Usa i tasti sopra)</div>
                                    </div>

                                    <button
                                        onClick={() => cancelHedgeMode('SHORT')}
                                        className="w-full py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                    >
                                        Annulla Hedge
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center px-4">
                                <button
                                    onClick={() => handleHedge('SHORT')}
                                    className="flex items-center gap-2 text-[10px] font-black text-purple-400/80 hover:text-purple-400 uppercase tracking-widest transition-colors"
                                >
                                    <Link size={14} className="opacity-70" /> Hedge Long
                                </button>

                                {lockInput?.side === 'SHORT' ? (
                                    <div className="flex gap-2 animate-in slide-in-from-right-2">
                                        <input
                                            type="number"
                                            value={lockInput.value}
                                            onChange={(e) => setLockInput({ ...lockInput, value: e.target.value === '' ? '' : Number(e.target.value) })}
                                            placeholder="€"
                                            className="w-20 bg-black/40 border border-amber-500/30 rounded-lg px-2 py-1 text-[10px] font-bold text-amber-400 outline-none"
                                        />
                                        <button onClick={handleLockSubmit} className="text-amber-500 hover:text-amber-400"><Check size={16} /></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleLockProfit('SHORT')}
                                        className="flex items-center gap-2 text-[10px] font-black text-amber-500/80 hover:text-amber-500 uppercase tracking-widest transition-colors"
                                    >
                                        <Lock size={14} className="opacity-70" /> Lock Profit
                                    </button>
                                )}
                            </div>
                        )}
                    </div>



                    <div className="bg-[#1a142e] border border-white/5 rounded-[22px] p-5 shadow-2xl relative overflow-hidden">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Active Stats</div>

                        <div className="flex items-center justify-between mb-8 px-2">
                            <div className="flex flex-col items-center">
                                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Capitale Attuale</div>
                                <div className="text-2xl font-black text-white">€{Math.ceil(currentShort.currentCapital).toLocaleString('it-IT')}</div>
                                <div className="flex gap-1.5 mt-2">
                                    <div className="text-[7px] text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">INS: €4700</div>
                                    <div className="text-[7px] text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">CO</div>
                                </div>
                            </div>

                            <div className="relative w-24 h-24">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent"
                                        strokeDasharray={2 * Math.PI * 40}
                                        strokeDashoffset={2 * Math.PI * 40 * (1 - Math.max(0, Math.min(1, (currentShort.currentCapital - currentShort.startCapital) / (currentShort.targetCapital - currentShort.startCapital))))}
                                        className="text-purple-500" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[9px] font-black text-white tracking-widest leading-none">Reached %</span>
                                    <span className="text-[11px] font-black text-purple-400 mt-0.5">{Math.max(0, Math.round(((currentShort.currentCapital - currentShort.startCapital) / (currentShort.targetCapital - currentShort.startCapital)) * 100))}%</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Capitale Target</div>
                                <div className="text-2xl font-black text-purple-400">€{Math.ceil(currentShort.targetCapital).toLocaleString('it-IT')}</div>
                                <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-2 px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">
                                    Raggiunto: {Math.max(0, Math.round(((currentShort.currentCapital - currentShort.startCapital) / (currentShort.targetCapital - currentShort.startCapital)) * 100))}%
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                    <ChartIcon size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Vittorie</span>
                                    <div className="text-xs font-black text-white">{winsShort} <span className="text-slate-600">/ {currentShort.expectedWins}</span></div>
                                </div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                                    <X size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Perdite</span>
                                    <div className="text-xs font-black text-white">{lossesShort} <span className="text-slate-600">/ {currentShort.totalEvents - currentShort.expectedWins}</span></div>
                                </div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <TrendingUp size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Red Line</span>
                                    <div className="text-xs font-black text-white">{currentShort.currentConsecutiveLosses} <span className="text-slate-600">/ {mShort || '-'}</span></div>
                                </div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
                                    <PieChart size={14} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Eventi Giocati</span>
                                    <div className="text-xs font-black text-white">{eventsPlayedShort} <span className="text-slate-600">/ {currentShort.totalEvents}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Transfer TO Long */}
                    <div className="mt-4 border-t border-white/5 pt-4">
                        <button
                            onClick={() => setTransferModal('SHORT_TO_LONG')}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowRightLeft size={12} /> Trasferisci a Long
                        </button>
                    </div>

                    {/* Short History */}
                    {displayHistoryShort.length > 0 && (
                        <div className="mt-6 border-t border-white/5 pt-4">
                            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Storico Trade Short</h4>
                            <div className="max-h-56 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {displayHistoryShort.map((ev: any) => (
                                    <div key={ev.id} className="flex flex-col p-2 rounded-lg bg-black/20 border border-white/5 transition-all hover:bg-black/30">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-black text-[10px] w-5 h-5 rounded flex items-center justify-center ${ev.isVoid ? 'bg-slate-700 text-slate-400' : ev.isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {ev.isWin ? 'W' : (ev.isVoid ? 'V' : 'L')}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                                        Stake: €{ev.stake.toLocaleString('it-IT')}
                                                    </span>
                                                    {(ev.isHedge || ev.note === 'edge') && (
                                                        <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-1 rounded border border-blue-500/20 w-fit">
                                                            EDGE TRADE
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-white">€{Math.ceil(ev.capitalAfter).toLocaleString('it-IT')}</div>
                                            </div>
                                        </div>
                                        {ev.note && ev.note !== 'edge' && (
                                            <div className="w-full mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-500 italic">
                                                {ev.note}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Twin Dashboard Analytics */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#121926] to-[#0a0f18] border border-white/5 shadow-2xl overflow-hidden relative">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                        <PieChart size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest leading-none">Twin Analytics</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Bilancio e Dominanza Direzionale</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* INTEGRATED EQUITY CURVE */}
                    <div className="bg-black/30 p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ChartIcon size={14} className="text-indigo-400" />
                                    Equity Curve Integrata
                                </h4>
                                <p className="text-[10px] text-slate-600 font-medium tracking-widest uppercase mt-1">Progressione totale bilanciata e lock profits</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                    <span className="text-[8px] text-slate-500 font-black uppercase">Long</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                                    <span className="text-[8px] text-slate-500 font-black uppercase">Short</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                    <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Global</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            {chartData.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorLong" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorShort" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCombined" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="5 5" stroke="#ffffff" strokeOpacity={0.03} vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#475569"
                                            fontSize={9}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={9}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `€${val}`}
                                        />
                                        <Tooltip content={<TwinTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="long"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorLong)"
                                            isAnimationActive={true}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="short"
                                            stroke="#a855f7"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorShort)"
                                            isAnimationActive={true}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="combined"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorCombined)"
                                            isAnimationActive={true}
                                            strokeDasharray="10 5"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600 bg-black/10 rounded-2xl border border-white/5">
                                    <ChartIcon size={40} className="opacity-20 translate-y-2" />
                                    <div className="text-center">
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em]">Nessun Dato Storico</div>
                                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-1">Esegui il primo trade per generare la curva</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Directional Dominance */}
                        <div className="bg-black/30 p-6 rounded-2xl border border-white/5">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 block">Dominanza Direzionale</div>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                        <span className="text-blue-400">Long</span>
                                        <span className="text-white">€{Math.ceil(currentLong.currentCapital - currentLong.startCapital)}</span>
                                    </div>
                                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                            style={{ width: `${Math.max(0, Math.min(100, (currentLong.currentCapital / totalCurrent) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                        <span className="text-purple-400">Short</span>
                                        <span className="text-white">€{Math.ceil(currentShort.currentCapital - currentShort.startCapital)}</span>
                                    </div>
                                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                            style={{ width: `${Math.max(0, Math.min(100, (currentShort.currentCapital / totalCurrent) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Snapshot History (Profit Locking) */}
                        <div className="bg-black/30 p-6 rounded-2xl border border-white/5 lg:col-span-2">
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profitti Consolidati (Locks)</div>
                                <div className="flex gap-6">
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Totale Locked</div>
                                        <div className="text-sm font-black text-amber-500">
                                            €{(twinState?.snapshots || []).reduce((acc, s) => acc + s.capitalLocked, 0).toLocaleString('it-IT')}
                                        </div>
                                    </div>
                                    <div className="text-right border-l border-white/10 pl-6">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Operazioni</div>
                                        <div className="text-sm font-black text-slate-300">
                                            {(twinState?.snapshots || []).length}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {twinState?.snapshots && twinState.snapshots.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {twinState.snapshots.map((snap, i) => (
                                        <div key={i} className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl flex items-center justify-between">
                                            <div>
                                                <div className="text-[9px] text-amber-500 font-black uppercase">{snap.side} Lock</div>
                                                <div className="text-xs text-white font-bold">€{snap.capitalLocked}</div>
                                            </div>
                                            <div className="text-[8px] text-slate-500 font-medium">
                                                {new Date(snap.timestamp).toLocaleDateString('it-IT')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center text-slate-600 italic text-xs">
                                    Nessun profitto consolidato al momento
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HISTORICAL LOGS - ALL CLOSED PLANS */}
                    <div className="mt-8">
                        {onSaveLog && twinState && (
                            <div className="flex justify-end mb-3">
                                <button
                                    onClick={() => {
                                        // Create a consolidated summary plan for the journal
                                        const consolidatedPlan = {
                                            ...twinState.planLong,
                                            id: `twin_log_${Date.now()}`,
                                            name: `${instance.name} (Integrated Session)`,
                                            startCapital: totalInitial,
                                            currentCapital: totalCurrent,
                                            events: [...(twinState.historyLong || []).flatMap(p => p.events), ...(twinState.historyShort || []).flatMap(p => p.events), ...currentLong.events, ...currentShort.events],
                                            status: 'active'
                                        };
                                        onSaveLog(consolidatedPlan);
                                        alert('Sessione Twin salvata nel Diario!');
                                    }}
                                    className="group flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded-xl border border-indigo-500/20 transition-all active:scale-95"
                                >
                                    <Save size={14} className="group-hover:scale-110 transition-transform" />
                                    Salva Diario
                                </button>
                            </div>
                        )}
                        <HistoryLog
                            history={instance.history || []}
                            expandedHistory={expandedHistory}
                            setExpandedHistory={setExpandedHistory}
                        />
                    </div>
                </div>

                {/* Transfer Modal */}
                {
                    transferModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-[#181c21] rounded-3xl p-8 max-w-sm w-full border border-white/10 shadow-2xl relative">
                                <button
                                    onClick={() => {
                                        setTransferModal(null);
                                        setTransferAmount('');
                                    }}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`p-3 rounded-xl ${transferModal === 'LONG_TO_SHORT' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        <ArrowRightLeft size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">Trasferimento</h3>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {transferModal === 'LONG_TO_SHORT' ? 'Da Long a Short' : 'Da Short a Long'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 block">Importo (€)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={transferModal === 'LONG_TO_SHORT' ? currentLong.currentCapital : currentShort.currentCapital}
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="Es. 100"
                                            autoFocus
                                        />
                                        <div className="text-[10px] text-slate-500 mt-2 text-right">
                                            Disponibile: €{Math.floor(transferModal === 'LONG_TO_SHORT' ? currentLong.currentCapital : currentShort.currentCapital)}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleTransfer}
                                        disabled={!transferAmount || Number(transferAmount) <= 0 || Number(transferAmount) > (transferModal === 'LONG_TO_SHORT' ? currentLong.currentCapital : currentShort.currentCapital)}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        Conferma Spostamento
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default TwinMasanielloView;
