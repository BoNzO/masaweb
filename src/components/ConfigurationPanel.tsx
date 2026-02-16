import React from 'react';
import { Settings, PiggyBank, Calculator, AlertTriangle, TrendingUp, RotateCcw } from 'lucide-react';
import type { Config } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';

interface ConfigurationPanelProps {
    config: Config;
    setConfig: (config: Config) => void;
    onStart: () => void;
    suggestedTarget?: number;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ config, setConfig, onStart, suggestedTarget }) => {
    const previewProfit = calculateMaxNetProfit(
        config.initialCapital,
        config.totalEvents,
        config.expectedWins,
        config.quota,
        config.maxConsecutiveLosses || 0
    );
    const previewTarget = config.initialCapital + previewProfit;
    const previewROI = config.initialCapital > 0 ? (previewProfit / config.initialCapital) * 100 : 0;

    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6 animate-in fade-in">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings size={20} /> Configurazione
            </h2>

            {/* ANTEPRIMA RENDIMENTO (SPOSTATO IN ALTO) */}
            <div className="sticky top-0 z-50 mb-6 p-4 bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 rounded-lg shadow-xl animate-in slide-in-from-top-2 transition-all">
                <h3 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">
                    <Calculator size={16} /> Anteprima Rendimento (Singolo Ciclo)
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-xs text-slate-400">Capitale Target</div>
                        <div className="font-bold text-green-400">
                            €{isNaN(previewTarget) ? '---' : roundTwo(previewTarget).toFixed(2)}
                            {suggestedTarget && (
                                <div className="text-[10px] text-slate-400 mt-1 font-normal opacity-80">
                                    Suggerito: €{roundTwo(suggestedTarget).toFixed(2)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400">Utile Netto</div>
                        <div className="font-bold text-green-400">
                            €{isNaN(previewProfit) ? '---' : roundTwo(previewProfit).toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400">Rendimento %</div>
                        <div className="font-bold text-indigo-400">{isNaN(previewROI) ? '---' : roundTwo(previewROI).toFixed(2)}%</div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Capitale Iniziale</label>
                    <input
                        type="number"
                        value={config.initialCapital}
                        onChange={(e) => setConfig({ ...config, initialCapital: parseFloat(e.target.value) })}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Quota</label>
                    <input
                        type="number"
                        step="0.1"
                        value={config.quota}
                        onChange={(e) => setConfig({ ...config, quota: parseFloat(e.target.value) })}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Eventi Totali</label>
                    <input
                        type="number"
                        value={config.totalEvents}
                        onChange={(e) => setConfig({ ...config, totalEvents: parseInt(e.target.value) })}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Vittorie Attese</label>
                    <input
                        type="number"
                        value={config.expectedWins}
                        onChange={(e) => setConfig({ ...config, expectedWins: parseInt(e.target.value) })}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Target Capitale Settimanale (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={config.weeklyTargetPercentage}
                        onChange={(e) => setConfig({ ...config, weeklyTargetPercentage: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                    />
                    <div className="text-xs text-slate-400 mt-1">
                        = €{((config.weeklyTargetPercentage / 100) * config.initialCapital).toFixed(2)} sul capitale iniziale
                    </div>
                </div>

                {/* SEZIONE: BANKING & PERFORMANCE */}
                <div className="col-span-2 mt-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <TrendingUp size={14} /> Banking & Crescita
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BANKING CICLO */}
                        <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl hover:bg-indigo-500/10 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                                        <PiggyBank size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Banking Target Settimanale</h4>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Accantonamento Post-Chiusura</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-indigo-400">{config.accumulationPercent}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                step="5"
                                value={config.accumulationPercent}
                                onChange={(e) => setConfig({ ...config, accumulationPercent: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed italic">
                                Quota di utile netto salvata nel "bank" al termine di ogni ciclo vincente.
                            </p>
                        </div>

                        {/* PROFITTO INCREMENTALE */}
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl hover:bg-emerald-500/10 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                        <TrendingUp size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Banking Progressivo</h4>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Accantonamento Milestone</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-emerald-400">{config.milestoneBankPercentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={config.milestoneBankPercentage}
                                onChange={(e) => setConfig({ ...config, milestoneBankPercentage: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed italic">
                                Accantona profitto ogni volta che il guadagno totale raggiunge un multiplo del capitale.
                            </p>
                        </div>
                    </div>
                </div>

                {/* SEZIONE: RISK & SAFETY */}
                <div className="col-span-2 mt-6">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <AlertTriangle size={14} /> Rischio & Protezione
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-center">
                        {/* LIMITE PERDITE CONSECUTIVE */}
                        <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-2xl hover:bg-orange-500/10 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400 group-hover:scale-110 transition-transform">
                                        <RotateCcw size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Red Line</h4>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Perdite Consecutive Max</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-orange-400">{config.maxConsecutiveLosses || 0}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                value={config.maxConsecutiveLosses || 0}
                                onChange={(e) => setConfig({ ...config, maxConsecutiveLosses: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <p className="text-[10px] text-orange-400 mt-3 leading-relaxed italic font-bold">
                                {config.maxConsecutiveLosses && config.maxConsecutiveLosses > 0
                                    ? `Il piano tollera fino a ${config.maxConsecutiveLosses} rossi consecutivi.`
                                    : "Nessun limite alle perdite consecutive."}
                            </p>
                        </div>


                    </div>
                </div>
            </div>



            <button onClick={onStart} className="mt-4 w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold transition-colors">
                Avvia Piano
            </button>
        </div>
    );
};

export default ConfigurationPanel;
