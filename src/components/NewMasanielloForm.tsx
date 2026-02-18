import React, { useState } from 'react';
import { Plus, Calculator, ClipboardCheck, Trash2, Crown, Link } from 'lucide-react';
import type { Config, MasanielloInstance } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';

interface NewMasanielloFormProps {
    poolCapital: number;
    onCreateMasaniello: (config: Config, initialCapital?: number, activeRules?: string[]) => void;
    activeInstances: MasanielloInstance[];
}

const AVAILABLE_RULES = [
    { id: 'auto_bank_100', label: 'Banking Target Settimanale', desc: 'Incassa % profitto al raggiungimento del target' },
    { id: 'profit_milestone', label: 'Banking Progressivo (Milestone)', desc: 'Incassa % profitto ogni volta che raddoppi il capitale' },
    { id: 'smart_auto_close', label: 'Smart Auto Close', desc: 'Chiudi in pari se possibile dopo sequenza negativa' },
    { id: 'stop_loss', label: 'Stop Loss', desc: 'Interrompi il piano se raggiungi il limite di perdite consecutive' },
    { id: 'first_win', label: 'Prima Vittoria Garantita (Bonus)', desc: 'Rimuovi rischio iniziale dopo prima vittoria' },
    { id: 'back_positive', label: 'Torna in Positivo', desc: 'Regola dinamica per recupero rapido' }
];

const NewMasanielloForm: React.FC<NewMasanielloFormProps> = ({ poolCapital, onCreateMasaniello, activeInstances }) => {
    const [config, setConfig] = useState<Config>({
        initialCapital: Math.min(1000, poolCapital),
        quota: 1.90,
        totalEvents: 10,
        expectedWins: 7,
        accumulationPercent: 50,
        weeklyTargetPercentage: 20,
        milestoneBankPercentage: 30,
        maxConsecutiveLosses: 3,
        checklistTemplate: [
            'Trend H1/H4 allineato?',
            'Ho raggiunto un PD Array > H4?',
            'News ad alto impatto evitate?',
            'Ho controllato che prima del target non ci siano altri PD Array su HTF?'
        ],
        role: 'standard',
        feedForwardConfig: { percentage: 50, totalFed: 0 },
        feedSource: { virtualBuffer: 0, isPaused: true }
    });

    const [selectedRules, setSelectedRules] = useState<string[]>([]);

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

    // Cap weekly target at ROI
    const maxWeeklyTarget = Math.floor(previewROI * 10) / 10;
    React.useEffect(() => {
        if (config.weeklyTargetPercentage > maxWeeklyTarget && previewROI > 0) {
            setConfig(prev => ({ ...prev, weeklyTargetPercentage: maxWeeklyTarget }));
        }
    }, [maxWeeklyTarget]);

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
                            min={config.role === 'slave' ? 0 : 100}
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
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">Parametri Avanzati</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* % ACCANTONAMENTO */}
                        <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl hover:bg-indigo-500/10 transition-colors group">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">% Accantonamento</h4>
                                    <p className="text-[10px] text-slate-500">Post-Chiusura Ciclo</p>
                                </div>
                                <span className="text-lg font-black text-indigo-400">{config.accumulationPercent}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={config.accumulationPercent}
                                onChange={(e) => setConfig({ ...config, accumulationPercent: Number(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        {/* TARGET SETTIMANALE % */}
                        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl hover:bg-blue-500/10 transition-colors group">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Target Settimanale %</h4>
                                    <p className="text-[10px] text-slate-500">Obiettivo di Crescita</p>
                                </div>
                                <span className="text-lg font-black text-blue-400">{config.weeklyTargetPercentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={maxWeeklyTarget > 0 ? maxWeeklyTarget : 0}
                                step="0.1"
                                value={config.weeklyTargetPercentage}
                                onChange={(e) => setConfig({ ...config, weeklyTargetPercentage: Number(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        {/* MILESTONE BANKING % */}
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl hover:bg-emerald-500/10 transition-colors group">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Milestone Banking %</h4>
                                    <p className="text-[10px] text-slate-500">Accantonamento Progressivo</p>
                                </div>
                                <span className="text-lg font-black text-emerald-400">{config.milestoneBankPercentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={config.milestoneBankPercentage}
                                onChange={(e) => setConfig({ ...config, milestoneBankPercentage: Number(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        {/* MAX PERDITE CONSECUTIVE */}
                        <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-2xl hover:bg-orange-500/10 transition-colors group">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Max Perdite Consecutive</h4>
                                    <p className="text-[10px] text-slate-500">Limite di Rischio (Red Line)</p>
                                </div>
                                <span className="text-lg font-black text-orange-400">{config.maxConsecutiveLosses || 0}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                value={config.maxConsecutiveLosses || 0}
                                onChange={(e) => setConfig({ ...config, maxConsecutiveLosses: Number(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Link Strategy */}
                <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <Link size={16} /> Link Strategy (Feed-Forward)
                    </h3>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            {['standard', 'master', 'slave'].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setConfig({
                                        ...config,
                                        role: role as any,
                                        initialCapital: role === 'slave' ? 0 : (config.initialCapital === 0 ? 1000 : config.initialCapital)
                                    })}
                                    className={`
                                        flex-1 px-4 py-3 rounded-xl border text-xs font-bold uppercase transition-all flex flex-col items-center gap-2
                                        ${config.role === role
                                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}
                                    `}
                                >
                                    {role === 'master' && <Crown size={14} />}
                                    {role === 'slave' && <Link size={14} />}
                                    {role === 'standard' && <Calculator size={14} />}
                                    {role}
                                </button>
                            ))}
                        </div>

                        {config.role === 'master' && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3">
                                <div className="text-[10px] text-yellow-300 font-medium mb-1">
                                    <span className="font-bold">Master Plan</span>: Questo piano alimenterà uno Slave con una parte dei suoi profitti. Puoi crearlo ora e collegarlo in seguito quando creerai lo Slave.
                                </div>
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Feed % to Slave</label>
                                    <span className="text-sm font-black text-yellow-400">{config.feedForwardConfig?.percentage}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={config.feedForwardConfig?.percentage || 50}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        feedForwardConfig: {
                                            percentage: Number(e.target.value),
                                            totalFed: config.feedForwardConfig?.totalFed || 0,
                                            slavePlanId: config.feedForwardConfig?.slavePlanId
                                        }
                                    })}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Select Slave Plan (Target - Opzionale)</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                                        value={config.feedForwardConfig?.slavePlanId || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            feedForwardConfig: {
                                                ...(config.feedForwardConfig || { percentage: 50, totalFed: 0 }),
                                                slavePlanId: e.target.value
                                            }
                                        })}
                                    >
                                        <option value="">-- No Slave Linked (Collega in seguito) --</option>
                                        {(activeInstances || []).filter(i => i.config.role === 'slave').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {config.role === 'slave' && (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-3">
                                <div className="text-[10px] text-purple-300 font-medium">
                                    <span className="font-bold">Slave Plan</span>: Questo piano userà capitale 0. Verrà attivato solo quando riceverà profitti dal Master selezionato.
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Link to Master (Necessario)</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                                        value={config.feedSource?.masterPlanId || ''}
                                        onChange={(e) => {
                                            const masterId = e.target.value;
                                            setConfig({
                                                ...config,
                                                feedSource: {
                                                    ...config.feedSource!,
                                                    masterPlanId: masterId
                                                },
                                                initialCapital: 0 // Slaves start with 0 capital
                                            });
                                        }}
                                        required
                                    >
                                        <option value="">-- Seleziona Master --</option>
                                        {(activeInstances || []).filter(i => i.config.role === 'master').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                    {!((activeInstances || []).some(i => i.config.role === 'master')) && (
                                        <p className="text-[10px] text-orange-400 mt-2">
                                            ⚠️ Devi creare prima un Master per poter creare uno Slave.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <ClipboardCheck size={16} /> Gatekeeper Checklist Template
                    </h3>
                    <div className="space-y-2">
                        {(config.checklistTemplate || []).map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => {
                                        const newTemplate = [...(config.checklistTemplate || [])];
                                        newTemplate[index] = e.target.value;
                                        setConfig({ ...config, checklistTemplate: newTemplate });
                                    }}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Inserisci condizione..."
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newTemplate = (config.checklistTemplate || []).filter((_, i) => i !== index);
                                        setConfig({ ...config, checklistTemplate: newTemplate });
                                    }}
                                    className="p-2 text-rose-500 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const newTemplate = [...(config.checklistTemplate || []), ''];
                                setConfig({ ...config, checklistTemplate: newTemplate });
                            }}
                            className="w-full py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase rounded-lg border border-slate-600 flex items-center justify-center gap-2 transition-all mt-2"
                        >
                            <Plus size={12} /> Aggiungi Condizione
                        </button>
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
