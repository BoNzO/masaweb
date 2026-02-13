import React from 'react';
import { Settings, PiggyBank, Calculator, AlertTriangle } from 'lucide-react';
import type { Config } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';

interface ConfigurationPanelProps {
    config: Config;
    setConfig: (config: Config) => void;
    onStart: () => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ config, setConfig, onStart }) => {
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
                <div className="col-span-2 bg-indigo-900/20 p-3 rounded border border-indigo-500/20">
                    <label className="block text-sm text-indigo-300 mb-2 font-bold flex items-center gap-2">
                        <PiggyBank size={16} /> Percentuale Accantonamento (fine ciclo)
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={config.accumulationPercent}
                            onChange={(e) => setConfig({ ...config, accumulationPercent: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-bold w-16 text-right text-indigo-400">{config.accumulationPercent}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Percentuale calcolata sul capitale finale. <br />
                        <span className="text-yellow-500">
                            Nota: L'accantonamento è limitato al solo utile netto. Il nuovo ciclo non partirà mai con un importo inferiore al capitale di partenza del ciclo precedente.
                        </span>
                    </p>
                </div>
                <div className="col-span-2 bg-green-900/20 p-3 rounded border border-green-500/20">
                    <label className="block text-sm text-green-300 mb-2 font-bold flex items-center gap-2">
                        <PiggyBank size={16} /> Percentuale Profit Milestone
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={config.milestoneBankPercentage}
                            onChange={(e) => setConfig({ ...config, milestoneBankPercentage: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-bold w-16 text-right text-green-400">{config.milestoneBankPercentage}%</span>
                    </div>
                </div>
                <div className="col-span-2 bg-red-900/20 p-3 rounded border border-red-500/20">
                    <label className="block text-sm text-red-300 mb-2 font-bold flex items-center gap-2">
                        <AlertTriangle size={16} /> Stop-Loss Ciclo: Perdita Massima (%)
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={config.stopLossPercentage}
                            onChange={(e) => setConfig({ ...config, stopLossPercentage: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-bold w-16 text-right text-red-400">{config.stopLossPercentage}%</span>
                    </div>
                </div>

                <div className="col-span-2 bg-slate-700/50 p-3 rounded border border-slate-500/20">
                    <label className="block text-sm text-slate-300 mb-2 font-bold flex items-center gap-2 uppercase tracking-wider text-[10px]">
                        <Settings size={14} /> Parametri Avanzati (Masaniello Condizionato)
                    </label>
                    <div className="flex flex-col gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs text-slate-400 font-medium">Max Rossi Consecutivi (0 = Nessun limite)</label>
                                <span className={`text-xs font-black ${config.maxConsecutiveLosses && config.maxConsecutiveLosses > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                                    {config.maxConsecutiveLosses || 0}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="1"
                                    value={config.maxConsecutiveLosses || 0}
                                    onChange={(e) => setConfig({ ...config, maxConsecutiveLosses: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </div>
                            {config.maxConsecutiveLosses ? (config.maxConsecutiveLosses > 0 && (
                                <p className="text-[10px] text-orange-400/70 mt-2 italic leading-tight">
                                    Attenzione: Se si verificano {config.maxConsecutiveLosses + 1} rossi consecutivi, il piano fallirà istantaneamente.
                                </p>
                            )) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
                <h3 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">
                    <Calculator size={16} /> Anteprima Rendimento (Singolo Ciclo)
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-xs text-slate-400">Capitale Target</div>
                        <div className="font-bold text-green-400">
                            €{isNaN(previewTarget) ? '---' : roundTwo(previewTarget).toFixed(2)}
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

            <button onClick={onStart} className="mt-4 w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold transition-colors">
                Avvia Piano
            </button>
        </div>
    );
};

export default ConfigurationPanel;
