import React, { useState, useEffect } from 'react';
import {
    X,
    RotateCcw,
    Check,
    TrendingUp,
    AlertCircle,
    Zap,
    History
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area
} from 'recharts';
import { calculateStake, createInitialPlan } from '../utils/masaLogic';
import type { Config, MasaPlan } from '../types/masaniello';

interface MasaSimulatorProps {
    initialConfig: Config;
    onClose: () => void;
}

const MasaSimulator: React.FC<MasaSimulatorProps> = ({ initialConfig, onClose }) => {
    const [simulatedPlan, setSimulatedPlan] = useState<MasaPlan | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [simulationStatus, setSimulationStatus] = useState<'active' | 'success' | 'failed'>('active');

    useEffect(() => {
        const plan = createInitialPlan(initialConfig);
        setSimulatedPlan(plan);
        setHistory([{
            step: 0,
            capital: plan.startCapital,
            stake: calculateStake(
                plan.currentCapital,
                plan.totalEvents,
                plan.expectedWins,
                plan.quota,
                plan.targetCapital,
                plan.maxConsecutiveLosses || 0,
                0
            ),
            isWin: null,
            wins: 0,
            losses: 0,
            remainingEvents: plan.totalEvents,
            currentCL: 0
        }]);
    }, [initialConfig]);

    if (!simulatedPlan) return null;

    const currentStake = calculateStake(
        simulatedPlan.currentCapital,
        simulatedPlan.remainingEvents,
        simulatedPlan.remainingWins,
        simulatedPlan.quota,
        simulatedPlan.targetCapital,
        simulatedPlan.maxConsecutiveLosses || 0,
        simulatedPlan.currentConsecutiveLosses || 0
    );

    const handleOutcome = (isWin: boolean) => {
        if (simulationStatus !== 'active') return;

        const stake = currentStake;
        const newCapital = isWin
            ? simulatedPlan.currentCapital + (stake * (simulatedPlan.quota - 1))
            : simulatedPlan.currentCapital - stake;

        const newWins = isWin ? simulatedPlan.wins + 1 : simulatedPlan.wins;
        const newLosses = isWin ? simulatedPlan.losses : simulatedPlan.losses + 1;
        const newRemainingEvents = simulatedPlan.remainingEvents - 1;
        const newRemainingWins = isWin ? simulatedPlan.remainingWins - 1 : simulatedPlan.remainingWins;
        const newCL = isWin ? 0 : (simulatedPlan.currentConsecutiveLosses || 0) + 1;

        let newStatus: 'active' | 'success' | 'failed' = 'active';
        if (newRemainingWins === 0 && newCapital >= simulatedPlan.targetCapital - 0.01) {
            newStatus = 'success';
        } else if (newRemainingWins > newRemainingEvents || (simulatedPlan.maxConsecutiveLosses && newCL > simulatedPlan.maxConsecutiveLosses)) {
            newStatus = 'failed';
        } else if (newRemainingEvents === 0) {
            newStatus = newCapital >= simulatedPlan.targetCapital - 0.01 ? 'success' : 'failed';
        }

        const nextStake = calculateStake(
            newCapital,
            newRemainingEvents,
            newRemainingWins,
            simulatedPlan.quota,
            simulatedPlan.targetCapital,
            simulatedPlan.maxConsecutiveLosses || 0,
            newCL
        );

        setSimulatedPlan({
            ...simulatedPlan,
            currentCapital: newCapital,
            remainingEvents: newRemainingEvents,
            remainingWins: newRemainingWins,
            wins: newWins,
            losses: newLosses,
            currentConsecutiveLosses: newCL,
            status: newStatus
        });

        setSimulationStatus(newStatus);
        setHistory(prev => [...prev, {
            step: prev.length,
            capital: Math.round(newCapital * 100) / 100,
            stake: Math.round(nextStake * 100) / 100,
            isWin,
            wins: newWins,
            losses: newLosses,
            remainingEvents: newRemainingEvents,
            currentCL: newCL
        }]);
    };

    const resetSimulation = () => {
        const plan = createInitialPlan(initialConfig);
        setSimulatedPlan(plan);
        setSimulationStatus('active');
        setHistory([{
            step: 0,
            capital: plan.startCapital,
            stake: calculateStake(
                plan.currentCapital,
                plan.totalEvents,
                plan.expectedWins,
                plan.quota,
                plan.targetCapital,
                plan.maxConsecutiveLosses || 0,
                0
            ),
            isWin: null,
            wins: 0,
            losses: 0,
            remainingEvents: plan.totalEvents,
            currentCL: 0
        }]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-[#0a0c10]/95 backdrop-blur-xl transition-all duration-300 animate-in fade-in">
            <div className="bg-[#12161f] w-full max-w-5xl h-[85vh] rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative">

                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-[#161b26] to-[#12161f] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest">Simulator Sandbox</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Stress Test della Configurazione</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-white/10"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                        <div className="lg:col-span-8 flex flex-col gap-8">
                            <div className="bg-black/20 rounded-[2rem] p-6 border border-white/5 h-64 relative text-left">
                                <div className="absolute top-4 left-6 z-10">
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Equity Simulation</div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        €{Math.round(simulatedPlan.currentCapital).toLocaleString('it-IT')}
                                    </div>
                                </div>

                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history}>
                                        <defs>
                                            <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="step" hide />
                                        <YAxis domain={['dataMin - 100', 'dataMax + 100']} hide />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-[#161b26] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Step {data.step}</div>
                                                            <div className="flex justify-between gap-6">
                                                                <span className="text-[10px] text-white/50 uppercase">Capitale</span>
                                                                <span className="text-xs font-bold text-white font-mono">€{data.capital}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-6 mt-1">
                                                                <span className="text-[10px] text-white/50 uppercase">Esito</span>
                                                                <span className={`text-[10px] font-black uppercase ${data.isWin === true ? 'text-emerald-400' : data.isWin === false ? 'text-rose-400' : 'text-slate-500'}`}>
                                                                    {data.isWin === true ? 'Vinto' : data.isWin === false ? 'Perso' : 'Inizio'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area type="monotone" dataKey="capital" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCap)" animationDuration={500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex-1 bg-black/40 rounded-[2.5rem] p-10 border border-white/5 flex flex-col justify-center items-center relative overflow-hidden text-center">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>

                                {simulationStatus === 'active' ? (
                                    <>
                                        <div className="mb-8">
                                            <div className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3">Stake Prossimo Trade</div>
                                            <div className="text-6xl font-black text-white tracking-tighter shadow-sm">
                                                €{Math.ceil(currentStake).toLocaleString('it-IT')}
                                            </div>
                                        </div>

                                        <div className="flex gap-6 w-full max-w-md">
                                            <button onClick={() => handleOutcome(true)} className="flex-1 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-[1.5rem] transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 flex flex-col items-center gap-1">
                                                <Check size={28} />
                                                <span className="text-xs">WIN</span>
                                            </button>
                                            <button onClick={() => handleOutcome(false)} className="flex-1 py-5 bg-rose-500 hover:bg-rose-400 text-white font-black uppercase tracking-widest rounded-[1.5rem] transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/20 flex flex-col items-center gap-1">
                                                <X size={28} />
                                                <span className="text-xs">LOSS</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="animate-in zoom-in duration-300">
                                        <div className={`p-8 rounded-full inline-block mb-6 ${simulationStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {simulationStatus === 'success' ? <TrendingUp size={64} /> : <AlertCircle size={64} />}
                                        </div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-widest mb-3">
                                            {simulationStatus === 'success' ? 'Target Raggiunto!' : 'Simulazione Fallita'}
                                        </h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">
                                            {simulationStatus === 'success'
                                                ? `Profitto Netto: €${Math.round((simulatedPlan.currentCapital - simulatedPlan.startCapital))}`
                                                : 'Il piano è saltato o ha superato i limiti impostati.'}
                                        </p>
                                        <button onClick={resetSimulation} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10 flex items-center gap-3 mx-auto">
                                            <RotateCcw size={18} /> Ricomincia Test
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-4 flex flex-col gap-6 text-left">
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                    <TrendingUp size={14} className="text-indigo-400" /> Parametri Attuali
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Target</span>
                                        <span className="text-sm font-black text-white">€{Math.round(simulatedPlan.targetCapital)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">ROI Stimato</span>
                                        <span className="text-sm font-black text-emerald-400">{Math.round(((simulatedPlan.targetCapital / simulatedPlan.startCapital) - 1) * 100)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Wins</span>
                                        <span className="text-sm font-black text-white">{simulatedPlan.wins} / {simulatedPlan.expectedWins}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Losses</span>
                                        <span className="text-sm font-black text-white">{simulatedPlan.losses} / {simulatedPlan.totalEvents - simulatedPlan.expectedWins}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-rose-500/20">
                                        <span className="text-[10px] text-rose-400/70 font-black uppercase">Red Line</span>
                                        <span className="text-sm font-black text-white">{simulatedPlan.currentConsecutiveLosses} / {simulatedPlan.maxConsecutiveLosses || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col h-full max-h-[400px]">
                                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <History size={14} className="text-amber-400" /> Cronologia Sandbox
                                </h4>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                    {[...history].reverse().map((h, i) => (
                                        <div key={i} className={`p-3 rounded-xl flex items-center justify-between group transition-all ${h.isWin === null ? 'bg-white/5' : h.isWin ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${h.isWin === null ? 'bg-slate-700 text-slate-400' : h.isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {h.isWin === null ? '0' : h.isWin ? 'W' : 'L'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-white font-bold font-mono">€{h.capital}</span>
                                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Stake: €{h.stake}</span>
                                                </div>
                                            </div>
                                            <div className="text-[8px] text-slate-600 font-bold uppercase group-hover:text-slate-400 transition-colors">
                                                CL: {h.currentCL || 0}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={resetSimulation} className="mt-4 w-full py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                                    Resetta Tutto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-black/50 p-4 px-8 flex items-center justify-between border-t border-white/5">
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Capitale Iniziale: €{initialConfig.initialCapital}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Quota: @{initialConfig.quota.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="text-[9px] text-indigo-400/50 font-black uppercase tracking-widest italic">
                        Solo Simulation Mode - Nessun impatto sul pool reale
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MasaSimulator;
