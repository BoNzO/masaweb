import React, { useState } from 'react';
import { Plus, Calculator } from 'lucide-react';
import type { Config } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';

interface NewMasanielloFormProps {
    poolCapital: number;
    onCreateMasaniello: (config: Config, initialCapital?: number, activeRules?: string[]) => void;
}

const AVAILABLE_RULES = [
    { id: 'auto_bank_100', label: 'Banking Target Settimanale', desc: 'Incassa % profitto al raggiungimento del target' },
    { id: 'profit_milestone', label: 'Banking Progressivo (Milestone)', desc: 'Incassa % profitto ogni volta che raddoppi il capitale' },
    { id: 'smart_auto_close', label: 'Smart Auto Close', desc: 'Chiudi in pari se possibile dopo sequenza negativa' },
    { id: 'stop_loss', label: 'Stop Loss', desc: 'Interrompi il piano se raggiungi il limite di perdite consecutive' },
    { id: 'first_win', label: 'Prima Vittoria Garantita (Bonus)', desc: 'Rimuovi rischio iniziale dopo prima vittoria' },
    { id: 'back_positive', label: 'Torna in Positivo', desc: 'Regola dinamica per recupero rapido' }
];

const NewMasanielloForm: React.FC<NewMasanielloFormProps> = ({ poolCapital, onCreateMasaniello }) => {
    const [config, setConfig] = useState<Config>({
        initialCapital: Math.min(1000, poolCapital),
        quota: 1.90,
        totalEvents: 10,
        expectedWins: 7,
        accumulationPercent: 50,
        weeklyTargetPercentage: 20,
        milestoneBankPercentage: 30,
        maxConsecutiveLosses: 3
    });

    const [selectedRules, setSelectedRules] = useState<string[]>([
        'auto_bank_100',
        'profit_milestone',
        'smart_auto_close',
        'first_win',
        'back_positive'
    ]);

    const toggleRule = (ruleId: string) => {
        setSelectedRules(prev =>
            prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
        );
    };

    const previewProfit = calculateMaxNetProfit(
        config.initialCapital,
        config.totalEvents,
        config.expectedWins,
        config.quota,
        config.maxConsecutiveLosses || 0
    );
    const previewTarget = config.initialCapital + previewProfit;
    const previewROI = config.initialCapital > 0 ? (previewProfit / config.initialCapital) * 100 : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (config.initialCapital > poolCapital) {
            alert(`Capitale insufficiente nel pool. Disponibile: €${poolCapital.toFixed(2)}`);
            return;
        }

        if (config.expectedWins > config.totalEvents) {
            alert('Le vittorie attese non possono superare il numero di eventi totali');
            return;
        }

        onCreateMasaniello(config, undefined, selectedRules);
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-500/20 p-3 rounded-lg">
                    <Plus size={24} className="text-green-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Crea Nuovo Masaniello</h2>
                    <p className="text-sm text-slate-400">
                        Capitale disponibile nel pool: <span className="font-bold text-blue-400">€{poolCapital.toFixed(2)}</span>
                    </p>
                </div>
            </div>

            {/* Yield Preview */}
            <div className="mb-6 p-4 bg-slate-900 border border-indigo-500/30 rounded-lg shadow-inner">
                <h3 className="text-xs font-bold text-indigo-300 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <Calculator size={14} /> Anteprima Resa Stimata
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Capitale Target</div>
                        <div className="text-lg font-black text-green-400">
                            €{isNaN(previewTarget) ? '---' : roundTwo(previewTarget).toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Utile Netto</div>
                        <div className="text-lg font-black text-green-400">
                            €{isNaN(previewProfit) ? '---' : roundTwo(previewProfit).toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Resa (ROI)</div>
                        <div className="text-lg font-black text-indigo-400">
                            {isNaN(previewROI) ? '---' : roundTwo(previewROI).toFixed(2)}%
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2">
                            Capitale Iniziale (€)
                        </label>
                        <input
                            type="number"
                            value={config.initialCapital}
                            onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
                            min={100}
                            max={poolCapital}
                            step={10}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Max: €{poolCapital.toFixed(2)}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2">
                            Quota Media
                        </label>
                        <input
                            type="number"
                            value={config.quota}
                            onChange={(e) => setConfig({ ...config, quota: Number(e.target.value) })}
                            min={1.10}
                            max={10}
                            step={0.05}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2">
                            Eventi Totali
                        </label>
                        <input
                            type="number"
                            value={config.totalEvents}
                            onChange={(e) => setConfig({ ...config, totalEvents: Number(e.target.value) })}
                            min={1}
                            max={50}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2">
                            Vittorie Attese
                        </label>
                        <input
                            type="number"
                            value={config.expectedWins}
                            onChange={(e) => setConfig({ ...config, expectedWins: Number(e.target.value) })}
                            min={1}
                            max={config.totalEvents}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Advanced Parameters */}
                <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">Parametri Avanzati</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">
                                % Accantonamento
                            </label>
                            <input
                                type="number"
                                value={config.accumulationPercent}
                                onChange={(e) => setConfig({ ...config, accumulationPercent: Number(e.target.value) })}
                                min={0}
                                max={100}
                                step={5}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">
                                Target Settimanale %
                            </label>
                            <input
                                type="number"
                                value={config.weeklyTargetPercentage}
                                onChange={(e) => setConfig({ ...config, weeklyTargetPercentage: Number(e.target.value) })}
                                min={0}
                                max={100}
                                step={0.1}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">
                                Milestone Banking %
                            </label>
                            <input
                                type="number"
                                value={config.milestoneBankPercentage}
                                onChange={(e) => setConfig({ ...config, milestoneBankPercentage: Number(e.target.value) })}
                                min={0}
                                max={100}
                                step={5}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>


                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">
                                Max Perdite Consecutive
                            </label>
                            <input
                                type="number"
                                value={config.maxConsecutiveLosses || 0}
                                onChange={(e) => setConfig({ ...config, maxConsecutiveLosses: Number(e.target.value) })}
                                min={0}
                                max={10}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Rules Section */}
                <div className="border-t border-slate-700 pt-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-300">Regole Attive</h3>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedRules.length === AVAILABLE_RULES.length) {
                                    setSelectedRules([]);
                                } else {
                                    setSelectedRules(AVAILABLE_RULES.map(r => r.id));
                                }
                            }}
                            className="text-[10px] uppercase font-bold text-slate-500 hover:text-blue-400 transition-colors"
                        >
                            {selectedRules.length === AVAILABLE_RULES.length ? 'Disattiva Tutti' : 'Attiva Tutti'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AVAILABLE_RULES.map(rule => (
                            <div
                                key={rule.id}
                                onClick={() => toggleRule(rule.id)}
                                className={`
                                    p-3 rounded-lg border cursor-pointer transition-all
                                    ${selectedRules.includes(rule.id)
                                        ? 'bg-blue-500/20 border-blue-500/50'
                                        : 'bg-slate-900 border-slate-700 opacity-60 hover:opacity-100'}
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`
                                        w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5
                                        ${selectedRules.includes(rule.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}
                                    `}>
                                        {selectedRules.includes(rule.id) && <span className="text-white text-xs font-bold">✓</span>}
                                    </div>
                                    <div>
                                        <div className={`text-xs font-bold ${selectedRules.includes(rule.id) ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {rule.label}
                                        </div>
                                        <div className="text-[10px] text-slate-500 leading-tight mt-1">
                                            {rule.desc}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    CREA MASANIELLO
                </button>
            </form>
        </div>
    );
};

export default NewMasanielloForm;
