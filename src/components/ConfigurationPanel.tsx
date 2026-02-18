import React from 'react';
import { Settings, PiggyBank, Calculator, AlertTriangle, TrendingUp, RotateCcw, ClipboardCheck, Trash2, Plus, Crown, Link } from 'lucide-react';
import type { Config, MasanielloInstance } from '../types/masaniello';
import { roundTwo, calculateMaxNetProfit } from '../utils/mathUtils';

interface ConfigurationPanelProps {
    config: Config;
    setConfig: (config: Config) => void;
    onStart: () => void;
    suggestedTarget?: number;
    activeRules?: string[];
    toggleRule?: (ruleId: string) => void;
    toggleAllRules?: (ruleIds: string[]) => void;
    activeInstances?: MasanielloInstance[];
}

const AVAILABLE_RULES = [
    { id: 'auto_bank_100', label: 'Banking Target Settimanale', desc: 'Incassa % profitto al raggiungimento del target' },
    { id: 'profit_milestone', label: 'Banking Progressivo (Milestone)', desc: 'Incassa % profitto ogni volta che raddoppi il capitale' },
    { id: 'smart_auto_close', label: 'Smart Auto Close', desc: 'Chiudi in pari se possibile dopo sequenza negativa' },
    { id: 'stop_loss', label: 'Stop Loss', desc: 'Interrompi il piano se raggiungi il limite di perdite consecutive' },
    { id: 'first_win', label: 'Prima Vittoria Garantita (Bonus)', desc: 'Rimuovi rischio iniziale dopo prima vittoria' },
    { id: 'back_positive', label: 'Torna in Positivo', desc: 'Regola dinamica per recupero rapido' }
];

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
    config,
    setConfig,
    onStart,
    suggestedTarget,
    activeRules,
    toggleRule,
    toggleAllRules,
    activeInstances = []
}) => {
    const effectiveCapital = (config.role === 'slave' && config.feedSource)
        ? (config.feedSource.virtualBuffer || 0)
        : config.initialCapital;

    const previewProfit = calculateMaxNetProfit(
        effectiveCapital,
        config.totalEvents,
        config.expectedWins,
        config.quota,
        config.maxConsecutiveLosses || 0
    );
    const previewTarget = effectiveCapital + previewProfit;
    const previewROI = effectiveCapital > 0 ? (previewProfit / effectiveCapital) * 100 : 0;

    // Cap weekly target at ROI
    const maxWeeklyTarget = Math.floor(previewROI * 10) / 10;
    React.useEffect(() => {
        if (config.weeklyTargetPercentage > maxWeeklyTarget && previewROI > 0) {
            setConfig({ ...config, weeklyTargetPercentage: maxWeeklyTarget });
        }
    }, [maxWeeklyTarget]);

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
                        min={config.role === 'slave' ? 0 : 100}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                        disabled={config.role === 'slave'}
                    />
                    {config.role === 'slave' && (
                        <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">Capitale Corrente (da Master)</div>
                            <div className="text-lg font-black text-white">
                                €{(config.feedSource?.virtualBuffer || 0).toFixed(2)}
                            </div>
                        </div>
                    )}
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

                {/* SEZIONE: BANKING & PERFORMANCE */}
                <div className="col-span-2 mt-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <TrendingUp size={14} /> Banking & Crescita
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* TARGET SETTIMANALE % */}
                        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl hover:bg-blue-500/10 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                        <TrendingUp size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Target Settimanale</h4>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Obiettivo di Crescita</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-blue-400">{config.weeklyTargetPercentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={maxWeeklyTarget > 0 ? maxWeeklyTarget : 0}
                                step="0.1"
                                value={config.weeklyTargetPercentage}
                                onChange={(e) => setConfig({ ...config, weeklyTargetPercentage: parseFloat(e.target.value) || 0 })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed italic">
                                = €{((config.weeklyTargetPercentage / 100) * config.initialCapital).toFixed(2)} sul capitale iniziale.
                            </p>
                        </div>
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

                {/* SEZIONE: LINK STRATEGY */}
                <div className="col-span-2 mt-6 border-t border-slate-700 pt-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Link size={14} /> Link Strategy (Feed-Forward)
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            {['standard', 'master', 'slave'].map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setConfig({ ...config, role: role as any })}
                                    className={`
                                        flex-1 px-4 py-3 rounded-xl border text-[10px] font-black uppercase transition-all flex flex-col items-center gap-2
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
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Feed % to Slave</label>
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
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Select Slave Plan (Target)</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                                        value={config.feedForwardConfig?.slavePlanId || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            feedForwardConfig: {
                                                ...config.feedForwardConfig!,
                                                slavePlanId: e.target.value
                                            }
                                        })}
                                    >
                                        <option value="">-- No Slave Linked --</option>
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
                                    <span className="font-bold">Slave Plan</span>: Questo piano userà capitale 0. Sarà alimentato esclusivamente dai profitti del Master selezionato.
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Link to Master (Source)</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                                        value={config.feedSource?.masterPlanId || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            feedSource: {
                                                ...config.feedSource!,
                                                masterPlanId: e.target.value
                                            },
                                            initialCapital: 0 // Slaves start with 0 capital
                                        })}
                                    >
                                        <option value="">-- Select Master --</option>
                                        {(activeInstances || []).filter(i => i.config.role === 'master').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* SEZIONE: GATEKEEPER CHECKLIST */}
                <div className="col-span-2 mt-6 border-t border-slate-700 pt-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <ClipboardCheck size={14} /> Gatekeeper Checklist Template
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
                                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="Es: Trend H1 confermato?"
                                />
                                <button
                                    onClick={() => {
                                        const newTemplate = (config.checklistTemplate || []).filter((_, i) => i !== index);
                                        setConfig({ ...config, checklistTemplate: newTemplate });
                                    }}
                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded border border-rose-500/20 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newTemplate = [...(config.checklistTemplate || []), ''];
                                setConfig({ ...config, checklistTemplate: newTemplate });
                            }}
                            className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded border border-indigo-500/20 flex items-center justify-center gap-2 transition-all mt-2"
                        >
                            <Plus size={12} /> Aggiungi Voce Checklist
                        </button>
                    </div>
                </div>

                {/* SEZIONE: REGOLE ATTIVE (Se supportate) */}
                {activeRules && toggleRule && (
                    <div className="col-span-2 mt-6 border-t border-slate-700 pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                Regole Attive
                            </h3>
                            {toggleAllRules && (
                                <button
                                    onClick={() => {
                                        if (activeRules.length === AVAILABLE_RULES.length) {
                                            toggleAllRules([]);
                                        } else {
                                            toggleAllRules(AVAILABLE_RULES.map(r => r.id));
                                        }
                                    }}
                                    className="text-[10px] uppercase font-bold text-slate-500 hover:text-blue-400 transition-colors"
                                >
                                    {activeRules.length === AVAILABLE_RULES.length ? 'Disattiva Tutti' : 'Attiva Tutti'}
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {AVAILABLE_RULES.map(rule => (
                                <div
                                    key={rule.id}
                                    onClick={() => toggleRule(rule.id)}
                                    className={`
                                        p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3
                                        ${activeRules.includes(rule.id)
                                            ? 'bg-blue-500/20 border-blue-500/50'
                                            : 'bg-slate-700/30 border-slate-600 opacity-60 hover:opacity-100'}
                                    `}
                                >
                                    <div className={`
                                        w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5
                                        ${activeRules.includes(rule.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}
                                    `}>
                                        {activeRules.includes(rule.id) && <span className="text-white text-xs font-bold">✓</span>}
                                    </div>
                                    <div>
                                        <div className={`text-xs font-bold ${activeRules.includes(rule.id) ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {rule.label}
                                        </div>
                                        <div className="text-[10px] text-slate-500 leading-tight mt-1">
                                            {rule.desc}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>



            <button onClick={onStart} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold transition-colors">
                Salva Modifiche
            </button>
        </div >
    );
};

export default ConfigurationPanel;
