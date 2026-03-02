import React, { useState } from 'react';
import {
    Plus,
    Calculator,
    ClipboardCheck,
    Trash2,
    Crown,
    Link,
    Settings,
    TrendingUp,
    RotateCcw,
    Check,
    Shield,
    Shuffle,
    Zap,
    Bookmark,
    Save,
    Layout,
    ArrowRight
} from 'lucide-react';
import type { Config, MasanielloInstance, StrategyTemplate } from '../types/masaniello';
import { calculateMaxNetProfit } from '../utils/mathUtils';
import MasaSimulator from './MasaSimulator';

// Strategy Library is now managed via localStorage

interface NewMasanielloFormProps {
    poolCapital: number;
    onCreateMasaniello: (config: Config, initialCapital?: number, activeRules?: string[]) => void;
    activeInstances: MasanielloInstance[];
}

const AVAILABLE_RULES = [
    { id: 'smart_auto_close', label: 'Smart Auto Close', desc: 'Chiudi in pari se possibile dopo sequenza negativa' },
    { id: 'first_win', label: 'Prima Vittoria Garantita (Bonus)', desc: 'Rimuovi rischio iniziale dopo prima vittoria' },
    { id: 'back_positive', label: 'Torna in Positivo', desc: 'Regola dinamica per recupero rapido' },
    { id: 'auto_bank_100', label: 'Auto Banking (Target Sett.)', desc: 'Chiudi e accantona quando raggiungi il target settimanale' },
    { id: 'profit_milestone', label: 'Profit Milestone', desc: 'Chiudi e accantona al raggiungimento di multipli del capitale' },
    { id: 'profit_90', label: 'Profit 90%', desc: 'Chiudi il ciclo quando raggiungi il 90% del profitto massimo' },
    { id: 'impossible', label: 'Stop Impossibile', desc: 'Ferma il ciclo se l\'obiettivo non è più raggiungibile matematicamente' }
];

const NewMasanielloForm: React.FC<NewMasanielloFormProps> = ({ poolCapital, onCreateMasaniello, activeInstances }) => {
    const [config, setConfig] = useState<Config>({
        initialCapital: Math.ceil(Math.min(1000, poolCapital)),
        quota: 1.90,
        totalEvents: 10,
        expectedWins: 7,
        accumulationPercent: 50,
        weeklyTargetPercentage: 20,
        milestoneBankPercentage: 30,
        maxConsecutiveLosses: 3,
        tradingCommission: 0,
        checklistTemplate: [
            'Trend H1/H4 allineato?',
            'Ho raggiunto un PD Array > H4?',
            'News ad alto impatto evitate?',
            'Ho controllato che prima del target non ci siano altri PD Array su HTF?'
        ],
        role: 'standard',
        feedForwardConfig: { percentage: 50, totalFed: 0 },
        feedSource: { virtualBuffer: 0, isPaused: true },
        elasticConfig: {
            enabled: false,
            triggerOnLosses: 3,
            addEvents: 3,
            addWins: 1,
            maxStretches: 2
        },
        twinConfig: {
            capitalLong: 1000,
            capitalShort: 1000,
            quotaLong: 1.90,
            quotaShort: 1.90,
            totalEventsLong: 10,
            totalEventsShort: 10,
            expectedWinsLong: 7,
            expectedWinsShort: 7
        }
    });

    const [showSimulator, setShowSimulator] = useState(false);
    const [isAsymmetricTwin, setIsAsymmetricTwin] = useState(false);
    const [selectedRules, setSelectedRules] = useState<string[]>([]);

    // Template State
    const [templates, setTemplates] = useState<StrategyTemplate[]>(() => {
        const saved = localStorage.getItem('masa_strategy_templates');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [templateName, setTemplateName] = useState('');
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);

    const applyTemplate = (template: StrategyTemplate) => {
        const newConfig = { ...config, ...template.config };
        if (template.type === 'twin') {
            newConfig.role = 'twin';
        } else if (template.type === 'differential') {
            newConfig.role = 'differential';
        } else {
            newConfig.role = 'standard';
        }
        setConfig(newConfig);
        setSelectedRules(template.activeRules);
    };

    const saveTemplate = () => {
        if (!templateName.trim()) {
            alert('Inserisci un nome per il template');
            return;
        }

        const newTemplate: StrategyTemplate = {
            id: `custom_${Date.now()}`,
            name: templateName,
            type: config.role === 'twin' ? 'twin' : config.role === 'differential' ? 'differential' : 'standard',
            activeRules: selectedRules,
            config: {
                quota: config.quota,
                totalEvents: config.totalEvents,
                expectedWins: config.expectedWins,
                maxConsecutiveLosses: config.maxConsecutiveLosses,
                weeklyTargetPercentage: config.weeklyTargetPercentage,
                accumulationPercent: config.accumulationPercent,
                milestoneBankPercentage: config.milestoneBankPercentage,
                tradingCommission: config.tradingCommission
            }
        };

        const customTemplates = templates.filter(t => !t.isDefault);
        const updatedCustom = [...customTemplates, newTemplate];
        localStorage.setItem('masa_strategy_templates', JSON.stringify(updatedCustom));
        setTemplates(updatedCustom);
        setTemplateName('');
        setShowSaveTemplate(false);
    };

    const toggleRule = (ruleId: string) => {
        setSelectedRules(prev =>
            prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
        );
    };

    const totalCapitalRequested = config.role === 'twin'
        ? (config.twinConfig?.capitalLong || 0) + (config.twinConfig?.capitalShort || 0)
        : config.initialCapital;

    const effectiveCapital = config.role === 'twin'
        ? totalCapitalRequested
        : config.initialCapital + (config.role === 'slave' && config.feedSource ? (config.feedSource.virtualBuffer || 0) : 0);

    const commissionRate = (config.tradingCommission || 0) / 100;
    const effectiveQuotaInForm = config.quota / (1 + commissionRate);

    const profitLong = config.role === 'twin'
        ? calculateMaxNetProfit(
            config.twinConfig?.capitalLong || (effectiveCapital / 2),
            config.twinConfig?.totalEventsLong || config.totalEvents,
            config.twinConfig?.expectedWinsLong || config.expectedWins,
            (config.twinConfig?.quotaLong || config.quota) / (1 + (commissionRate || 0)),
            config.maxConsecutiveLosses || 0
        ) : 0;

    const profitShort = config.role === 'twin'
        ? calculateMaxNetProfit(
            config.twinConfig?.capitalShort || (effectiveCapital / 2),
            config.twinConfig?.totalEventsShort || config.totalEvents,
            config.twinConfig?.expectedWinsShort || config.expectedWins,
            (config.twinConfig?.quotaShort || config.quota) / (1 + (commissionRate || 0)),
            config.maxConsecutiveLosses || 0
        ) : 0;

    const roiLong = config.role === 'twin' && (config.twinConfig?.capitalLong || (effectiveCapital / 2)) > 0
        ? (profitLong / (config.twinConfig?.capitalLong || (effectiveCapital / 2))) * 100 : 0;

    const roiShort = config.role === 'twin' && (config.twinConfig?.capitalShort || (effectiveCapital / 2)) > 0
        ? (profitShort / (config.twinConfig?.capitalShort || (effectiveCapital / 2))) * 100 : 0;

    const previewProfit = config.role === 'twin'
        ? profitLong + profitShort
        : calculateMaxNetProfit(
            effectiveCapital,
            config.totalEvents,
            config.expectedWins,
            effectiveQuotaInForm,
            config.maxConsecutiveLosses || 0
        );

    const previewTarget = effectiveCapital + previewProfit;
    const previewROI = effectiveCapital > 0 ? (previewProfit / effectiveCapital) * 100 : 0;

    const getSliderGradient = (val: number, color: string) => {
        return `linear-gradient(to right, ${color} 0%, ${color} ${val}%, #1e2329 ${val}%)`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Calculate total requested capital
        const totalReq = config.role === 'twin' ? (config.twinConfig?.capitalLong || 0) + (config.twinConfig?.capitalShort || 0) : config.initialCapital;

        if (totalReq > poolCapital) {
            alert(`Capitale insufficiente nel pool. Disponibile: €${Math.ceil(poolCapital).toLocaleString('it-IT')}`);
            return;
        }

        if (config.expectedWins > config.totalEvents) {
            alert('Le vittorie attese non possono superare il numero di eventi totali');
            return;
        }

        onCreateMasaniello(config, undefined, selectedRules);
    };

    return (
        <div className="relative flex flex-col h-[85vh] overflow-hidden">
            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto pr-2 pb-24 custom-scrollbar">
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-['DM_Mono']">
                    {/* HEADER PANEL */}
                    <div className="bg-[#0f1623] p-6 rounded-2xl border border-white/5 shadow-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#00d4aa]/10 flex items-center justify-center text-[#00d4aa]">
                                <Plus size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[#e8eaf0] tracking-tight">Nuovo Masaniello</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase tracking-widest text-[#5a6272] font-bold">Capitale Pool:</span>
                                    <span className="text-xs font-bold text-[#4f8ef7]">€{Math.ceil(poolCapital).toLocaleString('it-IT')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a6272] font-bold mb-1">Stato Configurazione</span>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse"></div>
                                <span className="text-[11px] text-[#00d4aa] font-bold font-['DM_Mono']">PRONTO PER IL LANCIO</span>
                            </div>
                        </div>

                        <div className="flex gap-3 ml-4">
                            <button
                                type="button"
                                onClick={() => setShowSimulator(true)}
                                className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/5"
                            >
                                <Zap size={14} /> Simulatore
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2 ${showSaveTemplate ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                            >
                                <Bookmark size={14} /> {showSaveTemplate ? 'Annulla Salvataggio' : 'Salva Template'}
                            </button>
                        </div>
                    </div>

                    {/* SAVE TEMPLATE PANEL overlay (inline) */}
                    {showSaveTemplate && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <Save size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Salva come Template</h3>
                                        <p className="text-[10px] text-amber-500/60 uppercase font-bold tracking-wider mt-0.5">La configurazione attuale sarà salvata nei tuoi preset</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Nome del template (es: Masa Conservativo 5/10)"
                                    className="flex-1 bg-[#1e2329] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-500/50 transition-colors"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
                                />
                                <button
                                    type="button"
                                    onClick={saveTemplate}
                                    className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
                                >
                                    Conferma Salvataggio
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STRATEGY TEMPLATES SELECTION */}
                    {templates.length > 0 && (
                        <div className="bg-[#0f1623] p-6 rounded-2xl border border-white/5 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Layout size={20} />
                                    </div>
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Libreria Strategie</h3>
                                </div>
                                <div className="text-[9px] text-[#5a6272] uppercase font-bold tracking-widest">Seleziona un preset rapido</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {templates.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => applyTemplate(t)}
                                        className="group bg-[#161b26] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-4 text-left transition-all hover:bg-indigo-500/5 relative overflow-hidden text-center"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[11px] font-black text-white uppercase tracking-wider line-clamp-1">{t.name}</div>
                                            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                                <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-[#5a6272] font-black uppercase">{t.config.expectedWins}/{t.config.totalEvents}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 rounded text-indigo-400 font-black uppercase">@{t.config.quota?.toFixed(2)}</span>
                                            </div>
                                            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                                Applica <ArrowRight size={10} />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const custom = templates.filter(temp => temp.id !== t.id);
                                                localStorage.setItem('masa_strategy_templates', JSON.stringify(custom));
                                                setTemplates(custom);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PERFORMANCE STRIP */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="bg-[#0f1623] p-6 group hover:bg-[#181c21] transition-colors relative">
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4aa] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6272] mb-2 font-medium">Capitale Target</div>
                            <div className="font-bold text-2xl lg:text-3xl tracking-tighter text-[#e8eaf0]">
                                €{isNaN(previewTarget) ? '---' : Math.ceil(previewTarget).toLocaleString('it-IT')}
                            </div>
                            <div className="text-[11px] text-[#5a6272] mt-1">partendo da €{Math.ceil(effectiveCapital).toLocaleString('it-IT')}</div>
                        </div>
                        <div className="bg-[#0f1623] p-6 group hover:bg-[#181c21] transition-colors relative">
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4aa] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6272] mb-2 font-medium">Utile Netto</div>
                            <div className="font-bold text-2xl lg:text-3xl tracking-tighter text-[#00d4aa]">
                                +€{isNaN(previewProfit) ? '---' : Math.ceil(previewProfit).toLocaleString('it-IT')}
                            </div>
                            {config.role === 'twin' && (
                                <div className="flex justify-center gap-3 mt-1.5 border-t border-white/5 pt-1.5">
                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">L: +€{Math.ceil(profitLong).toLocaleString('it-IT')}</span>
                                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">S: +€{Math.ceil(profitShort).toLocaleString('it-IT')}</span>
                                </div>
                            )}
                            <div className="text-[11px] text-[#5a6272] mt-1">su singolo ciclo</div>
                        </div>
                        <div className="bg-[#0f1623] p-6 group hover:bg-[#181c21] transition-colors relative">
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f59e0b] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6272] mb-2 font-medium">Rendimento %</div>
                            <div className="font-bold text-2xl lg:text-3xl tracking-tighter text-[#f59e0b] flex items-baseline gap-2">
                                {isNaN(previewROI) ? '---' : Math.ceil(previewROI)}%
                                <span className="text-xs opacity-60 font-medium tracking-normal">(quota {((previewROI / 100) + 1).toFixed(2)})</span>
                            </div>
                            {config.role === 'twin' && (
                                <div className="flex justify-center gap-3 mt-1.5 border-t border-white/5 pt-1.5">
                                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">L: {Math.ceil(roiLong)}%</span>
                                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">S: {Math.ceil(roiShort)}%</span>
                                </div>
                            )}
                            <div className="text-[11px] text-[#5a6272] mt-1">
                                {config.role === 'twin' && isAsymmetricTwin ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="flex gap-3 justify-center">
                                            <span className="text-blue-400 font-black">L: {config.twinConfig?.expectedWinsLong || config.expectedWins}/{config.twinConfig?.totalEventsLong || config.totalEvents}</span>
                                            <span className="text-slate-600 font-bold">·</span>
                                            <span className="text-purple-400 font-black">S: {config.twinConfig?.expectedWinsShort || config.expectedWins}/{config.twinConfig?.totalEventsShort || config.totalEvents}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>{config.expectedWins} vittorie / {config.totalEvents} eventi</>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PARAMETRI BASE CARD */}
                        <div className="bg-[#0f1623] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="font-bold text-[11px] uppercase tracking-widest text-[#8a919f] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#4f8ef7]/10 flex items-center justify-center text-[#4f8ef7] text-sm">
                                        <Settings size={16} />
                                    </div>
                                    Parametri Base
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full group">
                                        {config.role === 'twin' ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[10px] uppercase tracking-wider text-[#5a6272]">Parametri Operativi</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAsymmetricTwin(!isAsymmetricTwin)}
                                                        className={`text-[9px] px-2 py-1 rounded-md border flex items-center gap-2 transition-all ${isAsymmetricTwin ? 'bg-[#4f8ef7]/20 border-[#4f8ef7]/40 text-[#4f8ef7]' : 'bg-transparent border-white/10 text-[#5a6272]'}`}
                                                    >
                                                        <Shuffle size={10} />
                                                        {isAsymmetricTwin ? 'ASIMMETRIA ATTIVA' : 'SINC. AUTOMATICA'}
                                                    </button>
                                                </div>

                                                <div className="flex gap-4">
                                                    {/* LONG SETTINGS */}
                                                    <div className="flex-1 space-y-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-blue-400/60 pb-2 border-b border-blue-500/10 flex items-center justify-between">
                                                            GEMELLO LONG
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                                        </div>

                                                        <div className="group">
                                                            <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block group-focus-within:text-blue-400 transition-colors">Capitale Iniziale (€)</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-[#1e2329] border border-white/5 focus:border-blue-400/50 focus:bg-blue-400/5 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                value={Math.ceil(config.twinConfig?.capitalLong || 0)}
                                                                onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, capitalLong: Math.ceil(parseFloat(e.target.value) || 0) } })}
                                                                min={100}
                                                            />
                                                        </div>

                                                        {isAsymmetricTwin && (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Quota @</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-full bg-[#1e2329] border border-white/5 focus:border-blue-400/50 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                            value={config.twinConfig?.quotaLong || config.quota}
                                                                            onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, quotaLong: parseFloat(e.target.value) || 1.01 } })}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Resa %</label>
                                                                        <div className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs text-blue-400/60 font-mono">
                                                                            {Math.ceil(((config.twinConfig?.quotaLong || config.quota) - 1) * 100)}%
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Eventi</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full bg-[#1e2329] border border-white/5 focus:border-blue-400/50 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                            value={config.twinConfig?.totalEventsLong || config.totalEvents}
                                                                            onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, totalEventsLong: parseInt(e.target.value) || 0 } })}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Vittorie</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full bg-[#1e2329] border border-white/5 focus:border-blue-400/50 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                            value={config.twinConfig?.expectedWinsLong || config.expectedWins}
                                                                            onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, expectedWinsLong: parseInt(e.target.value) || 0 } })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* SHORT SETTINGS */}
                                                    <div className="flex-1 space-y-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-purple-400/60 pb-2 border-b border-purple-500/10 flex items-center justify-between">
                                                            GEMELLO SHORT
                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                                                        </div>

                                                        <div className="group">
                                                            <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block group-focus-within:text-purple-400 transition-colors">Capitale Iniziale (€)</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-[#1e2329] border border-white/5 focus:border-purple-400/50 focus:bg-purple-400/5 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                value={Math.ceil(config.twinConfig?.capitalShort || 0)}
                                                                onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, capitalShort: Math.ceil(parseFloat(e.target.value) || 0) } })}
                                                                min={100}
                                                            />
                                                        </div>

                                                        {isAsymmetricTwin && (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Quota @</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="w-full bg-[#1e2329] border border-white/5 focus:border-purple-400/50 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                            value={config.twinConfig?.quotaShort || config.quota}
                                                                            onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, quotaShort: parseFloat(e.target.value) || 1.01 } })}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Resa %</label>
                                                                        <div className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs text-purple-400/60 font-mono">
                                                                            {Math.ceil(((config.twinConfig?.quotaShort || config.quota) - 1) * 100)}%
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Eventi</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full bg-[#1e2329] border border-white/5 focus:border-purple-400/50 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                            value={config.twinConfig?.totalEventsShort || config.totalEvents}
                                                                            onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, totalEventsShort: parseInt(e.target.value) || 0 } })}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Vittorie</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full bg-[#1e2329] border border-white/5 focus:border-purple-400/50 transition-all outline-none rounded-xl px-3 py-2 text-xs text-[#e8eaf0]"
                                                                            value={config.twinConfig?.expectedWinsShort || config.expectedWins}
                                                                            onChange={(e) => setConfig({ ...config, twinConfig: { ...config.twinConfig!, expectedWinsShort: parseInt(e.target.value) || 0 } })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <label className="text-[10px] uppercase tracking-wider text-[#5a6272] mb-1.5 block group-focus-within:text-[#00d4aa] transition-colors">Capitale Iniziale (€)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-[#1e2329] border border-white/5 focus:border-[#00d4aa]/50 focus:bg-[#00d4aa]/5 transition-all outline-none rounded-xl px-4 py-3 text-sm text-[#e8eaf0]"
                                                    value={Math.ceil(config.initialCapital)}
                                                    onChange={(e) => setConfig({ ...config, initialCapital: Math.ceil(parseFloat(e.target.value) || 0) })}
                                                    min={config.role === 'slave' ? 0 : 100}
                                                    disabled={false}
                                                />
                                            </>
                                        )}
                                        {config.role === 'slave' && (
                                            <div className="mt-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                                <div className="text-[9px] uppercase tracking-[0.2em] text-indigo-400/60 mb-1">Source (Feed from Master)</div>
                                                <div className="text-sm font-bold text-indigo-300">
                                                    Piano Slave gestito tramite feed esterno
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!isAsymmetricTwin && (
                                        <>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Eventi Totali</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-[#1e2329] border border-white/5 focus:border-[#4f8ef7]/50 focus:bg-[#4f8ef7]/5 transition-all outline-none rounded-xl px-4 py-3 text-sm text-[#e8eaf0]"
                                                    value={config.totalEvents}
                                                    onChange={(e) => setConfig({ ...config, totalEvents: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Vittorie Attese</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-[#1e2329] border border-white/5 focus:border-[#4f8ef7]/50 focus:bg-[#4f8ef7]/5 transition-all outline-none rounded-xl px-4 py-3 text-sm text-[#e8eaf0]"
                                                    value={config.expectedWins}
                                                    onChange={(e) => setConfig({ ...config, expectedWins: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {!isAsymmetricTwin && (
                                    <div>
                                        <div className="flex gap-4 w-full">
                                            {/* RISK REWARD INPUT */}
                                            <div className="relative group flex-1 mt-2">
                                                <div className="absolute top-[-10px] left-3 bg-[#0f1623] px-1 text-[9px] text-[#5a6272] uppercase tracking-widest z-10 group-focus-within:text-[#00d4aa] transition-colors">Risk:Reward</div>
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6272] text-sm group-focus-within:text-[#00d4aa]">1 :</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    className="w-full bg-[#1e2329] border border-white/5 focus:border-[#00d4aa]/50 focus:bg-[#00d4aa]/5 transition-all outline-none rounded-xl pl-10 pr-4 py-3 text-sm text-[#e8eaf0]"
                                                    value={parseFloat((config.quota - 1).toFixed(2))}
                                                    onChange={(e) => {
                                                        const q = (parseFloat(e.target.value) || 0) + 1;
                                                        setConfig({ ...config, quota: q });
                                                    }}
                                                />
                                            </div>
                                            {/* QUOTA INPUT */}
                                            <div className="relative group flex-1 mt-2">
                                                <div className="absolute top-[-10px] left-3 bg-[#0f1623] px-1 text-[9px] text-[#5a6272] uppercase tracking-widest z-10 group-focus-within:text-[#00d4aa] transition-colors">Quota</div>
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6272] text-sm group-focus-within:text-[#00d4aa]">@</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1.01"
                                                    className="w-full bg-[#1e2329] border border-white/5 focus:border-[#00d4aa]/50 focus:bg-[#00d4aa]/5 transition-all outline-none rounded-xl pl-8 pr-4 py-3 text-sm text-[#e8eaf0]"
                                                    value={parseFloat(config.quota.toFixed(2))}
                                                    onChange={(e) => {
                                                        const q = parseFloat(e.target.value) || 1.01;
                                                        setConfig({ ...config, quota: q });
                                                    }}
                                                />
                                            </div>
                                            {/* COMMISSION INPUT */}
                                            <div className="relative group flex-1 mt-2">
                                                <div className="absolute top-[-10px] left-3 bg-[#0f1623] px-1 text-[9px] text-[#5a6272] uppercase tracking-widest z-10 group-focus-within:text-[#00d4aa] transition-colors">Comm. (%)</div>
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a6272] text-[10px] group-focus-within:text-[#00d4aa]">%</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full bg-[#1e2329] border border-white/5 focus:border-[#00d4aa]/50 focus:bg-[#00d4aa]/5 transition-all outline-none rounded-xl px-4 py-3 text-sm text-[#e8eaf0]"
                                                    value={config.tradingCommission || 0}
                                                    onChange={(e) => setConfig({ ...config, tradingCommission: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BANKING & CRESCITA CARD */}
                        <div className="bg-[#0f1623] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors flex flex-col">
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="font-bold text-[11px] uppercase tracking-widest text-[#8a919f] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#00d4aa]/10 flex items-center justify-center text-[#00d4aa] text-sm">
                                        <TrendingUp size={16} />
                                    </div>
                                    Banking & Crescita
                                </div>
                            </div>

                            <div className="flex-1 divide-y divide-white/5">
                                {config.role !== 'slave' && config.role !== 'twin' && (
                                    <>
                                        {/* TARGET SETTIMANALE */}
                                        <div className="group transition-colors hover:bg-[#181c21]">
                                            <div className="px-6 py-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="font-medium text-[13px] text-[#e8eaf0]">Target Settimanale</div>
                                                    <div className="text-[11px] text-[#5a6272]">Obiettivo di crescita — +€{Math.ceil((config.weeklyTargetPercentage / 100) * effectiveCapital).toLocaleString('it-IT')}</div>
                                                </div>
                                                <div className={`text-sm font-bold min-w-[48px] text-right ${config.weeklyTargetPercentage > 0 ? 'text-[#00d4aa]' : 'text-[#5a6272]'}`}>
                                                    {Math.ceil(config.weeklyTargetPercentage)}%
                                                </div>
                                            </div>
                                            <div className="px-6 pb-6">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={config.weeklyTargetPercentage}
                                                    style={{
                                                        accentColor: '#00d4aa',
                                                        background: getSliderGradient(config.weeklyTargetPercentage, '#00d4aa')
                                                    }}
                                                    onChange={(e) => setConfig({ ...config, weeklyTargetPercentage: parseFloat(e.target.value) || 0 })}
                                                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        {/* BANKING TARGET */}
                                        <div className="group transition-colors hover:bg-[#181c21]">
                                            <div className="px-6 py-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="font-medium text-[13px] text-[#e8eaf0]">Banking Target Sett.</div>
                                                    <div className="text-[11px] text-[#5a6272]">Accantonamento post-chiusura ciclo</div>
                                                </div>
                                                <div className={`text-sm font-bold min-w-[48px] text-right ${config.accumulationPercent > 0 ? 'text-[#00d4aa]' : 'text-[#5a6272]'}`}>
                                                    {config.accumulationPercent}%
                                                </div>
                                            </div>
                                            <div className="px-6 pb-6">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50"
                                                    step="5"
                                                    value={config.accumulationPercent}
                                                    style={{
                                                        accentColor: '#00d4aa',
                                                        background: getSliderGradient((config.accumulationPercent / 50) * 100, '#00d4aa')
                                                    }}
                                                    onChange={(e) => setConfig({ ...config, accumulationPercent: parseInt(e.target.value) || 0 })}
                                                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        {/* BANKING PROGRESSIVO */}
                                        <div className="group transition-colors hover:bg-[#181c21]">
                                            <div className="px-6 py-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="font-medium text-[13px] text-[#e8eaf0]">Banking Progressivo</div>
                                                    <div className="text-[11px] text-[#5a6272]">Milestone — accantona a ogni multiplo</div>
                                                </div>
                                                <div className={`text-sm font-bold min-w-[48px] text-right ${config.milestoneBankPercentage > 0 ? 'text-[#f59e0b]' : 'text-[#5a6272]'}`}>
                                                    {config.milestoneBankPercentage}%
                                                </div>
                                            </div>
                                            <div className="px-6 pb-6">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={config.milestoneBankPercentage}
                                                    style={{
                                                        accentColor: '#f59e0b',
                                                        background: getSliderGradient(config.milestoneBankPercentage, '#f59e0b')
                                                    }}
                                                    onChange={(e) => setConfig({ ...config, milestoneBankPercentage: parseInt(e.target.value) || 0 })}
                                                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {config.role === 'twin' && (
                                    <div className="px-6 py-10 text-center space-y-3">
                                        <div className="text-[#5a6272] text-[11px] italic uppercase tracking-widest px-10">
                                            Banking non disponibile in modalità Twin Trading.<br />
                                        </div>
                                        <div className="text-[10px] text-[#5a6272]/60 px-8 leading-relaxed">
                                            Il Twin Trading gestisce due flussi speculari dove il profitto è calcolato sull'intero sistema.
                                        </div>
                                    </div>
                                )}

                                {/* RED LINE */}
                                <div className="group transition-colors hover:bg-[#181c21] relative">
                                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-[#ff4d6a]/10 rounded-lg text-[#ff4d6a]">
                                                <RotateCcw size={14} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-[13px] text-[#e8eaf0]">Red Line</div>
                                                <div className="text-[11px] text-[#ff4d6a]/70 font-medium">Max perdite consecutive — tolleranza</div>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-bold min-w-[48px] text-right text-[#ff4d6a]`}>
                                            {config.maxConsecutiveLosses || 0}
                                        </div>
                                    </div>
                                    <div className="px-6 pb-6">
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            step="1"
                                            value={config.maxConsecutiveLosses || 0}
                                            style={{
                                                accentColor: '#ff4d6a',
                                                background: getSliderGradient((config.maxConsecutiveLosses || 0) * 10, '#ff4d6a')
                                            }}
                                            onChange={(e) => setConfig({ ...config, maxConsecutiveLosses: parseInt(e.target.value) || 0 })}
                                            className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="px-6 py-2 bg-black/5 border-t border-white/5 flex items-center gap-2 text-[#5a6272] text-[10px]">
                                        <span className="text-[#00d4aa]">↳</span> Tolleranza: {config.maxConsecutiveLosses} rossi consecutivi prima dello stop.
                                    </div>
                                </div>

                                {/* ELASTIC HORIZON */}
                                <div className="group transition-colors hover:bg-[#181c21] relative">
                                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg transition-colors ${config.elasticConfig?.enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/20 text-slate-500'}`}>
                                                <Shield size={14} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-[13px] text-[#e8eaf0]">Ammortizzatore Elastico</div>
                                                <div className="text-[11px] text-[#8a919f] font-medium">Dynamic Horizon Recovery Mode</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setConfig({
                                                ...config,
                                                elasticConfig: {
                                                    ...config.elasticConfig!,
                                                    enabled: !config.elasticConfig?.enabled
                                                }
                                            })}
                                            className={`w-8 h-4 rounded-full transition-all relative ${config.elasticConfig?.enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${config.elasticConfig?.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>

                                    {config.elasticConfig?.enabled && (
                                        <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Trigger (Consec. Loss)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-[#1e2329] border border-white/5 focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all outline-none rounded-xl px-3 py-2 text-[11px] text-[#e8eaf0]"
                                                        value={config.elasticConfig.triggerOnLosses}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            elasticConfig: { ...config.elasticConfig!, triggerOnLosses: parseInt(e.target.value) || 0 }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Max Estensioni</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-[#1e2329] border border-white/5 focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all outline-none rounded-xl px-3 py-2 text-[11px] text-[#e8eaf0]"
                                                        value={config.elasticConfig.maxStretches}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            elasticConfig: { ...config.elasticConfig!, maxStretches: parseInt(e.target.value) || 0 }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Aggiungi Eventi</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-[#1e2329] border border-white/5 focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all outline-none rounded-xl px-3 py-2 text-[11px] text-[#e8eaf0]"
                                                        value={config.elasticConfig.addEvents}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            elasticConfig: { ...config.elasticConfig!, addEvents: parseInt(e.target.value) || 0 }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] uppercase tracking-wider text-[#5a6272] mb-1.5 block">Aggiungi Vittorie</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-[#1e2329] border border-white/5 focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all outline-none rounded-xl px-3 py-2 text-[11px] text-[#e8eaf0]"
                                                        value={config.elasticConfig.addWins}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            elasticConfig: { ...config.elasticConfig!, addWins: Math.min(config.elasticConfig!.addEvents, parseInt(e.target.value) || 0) }
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-indigo-400 font-medium italic">
                                                Note: L'estensione abbassa lo stake ricalcolando il piano su un orizzonte temporale più lungo.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LINK STRATEGY */}
                        <div className="bg-[#0f1623] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="font-bold text-[11px] uppercase tracking-widest text-[#8a919f] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#4f8ef7]/10 flex items-center justify-center text-[#4f8ef7] text-sm">
                                        <Link size={16} />
                                    </div>
                                    Link Strategy
                                </div>
                            </div>
                            <div className="p-0">
                                <div className="grid grid-cols-5 gap-1 p-4 bg-black/10">
                                    {['standard', 'differential', 'twin'].map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => {
                                                const updates: any = { role: role as any };
                                                if (role === 'twin') {
                                                    updates.accumulationPercent = 0;
                                                    updates.weeklyTargetPercentage = 0;
                                                    updates.milestoneBankPercentage = 0;
                                                }
                                                setConfig({ ...config, ...updates });
                                            }}
                                            className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${config.role === role
                                                ? 'bg-[#4f8ef7]/10 border-[#4f8ef7]/30 text-[#4f8ef7] shadow-lg shadow-[#4f8ef7]/5'
                                                : 'bg-transparent border-transparent text-[#5a6272] hover:text-[#8a919f]'
                                                }`}
                                        >
                                            <span className="text-sm">
                                                {role === 'master' && <Crown size={18} />}
                                                {role === 'slave' && <Link size={18} />}
                                                {role === 'standard' && <Calculator size={18} />}
                                                {role === 'differential' && <TrendingUp size={18} />}
                                                {role === 'twin' && <Shuffle size={18} />}
                                            </span>
                                            <span className="text-[9px] uppercase tracking-widest font-bold">{role === 'differential' ? 'diff' : role}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-6 text-[11px] text-[#5a6272] italic leading-relaxed">
                                    {config.role === 'master' && "Modalità Master: Questo piano alimenterà regolarmente un profilo Slave con parte dei propri profitti."}
                                    {config.role === 'slave' && "Modalità Slave: Questo piano userà capitale virtuale alimentato dal profitto del Master collegato."}
                                    {config.role === 'standard' && "Modalità Standard: Operatività indipendente senza flussi di profitto condivisi."}
                                    {config.role === 'differential' && "Modalità Differenziale: Gestisce due istanze speculari, visualizzando solo lo stake differenziale per ottimizzare il capitale impegnato."}
                                    {config.role === 'twin' && "Modalità Twin Trading: Due Masanielli indipendenti e speculari (Long/Short) che non comunicano. Utile per isolare i drawdown sui trade contro-trend."}
                                    {config.role === 'slave' && (
                                        <div className="mt-4 not-italic">
                                            <label className="text-[10px] uppercase tracking-wider text-[#5a6272] block mb-2">Collega a Master</label>
                                            <select
                                                className="w-full bg-[#1e2329] border border-white/5 transition-all outline-none rounded-xl px-4 py-3 text-[11px] text-[#e8eaf0] cursor-pointer"
                                                value={config.feedSource?.masterPlanId || ''}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    feedSource: { ...config.feedSource!, masterPlanId: e.target.value }
                                                })}
                                                required={config.role === 'slave'}
                                            >
                                                <option value="">— Seleziona Master —</option>
                                                {activeInstances.filter(i => i.config.role === 'master').map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* GATEKEEPER CHECKLIST */}
                        <div className="bg-[#0f1623] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors flex flex-col">
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="font-bold text-[11px] uppercase tracking-widest text-[#8a919f] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center text-[#f59e0b] text-sm">
                                        <ClipboardCheck size={16} />
                                    </div>
                                    Gatekeeper Checklist
                                </div>
                                <span className="text-[9px] text-[#5a6272] tracking-[0.2em]">{(config.checklistTemplate || []).length} voci</span>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[350px] divide-y divide-white/5">
                                {(config.checklistTemplate || []).map((item, index) => (
                                    <div key={index} className="group px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                        <div className="w-5 h-5 rounded-md border border-white/10 bg-[#1e2329] flex items-center justify-center text-[#00d4aa] text-[10px] shrink-0">
                                            <Check size={10} />
                                        </div>
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => {
                                                const newTemplate = [...(config.checklistTemplate || [])];
                                                newTemplate[index] = e.target.value;
                                                setConfig({ ...config, checklistTemplate: newTemplate });
                                            }}
                                            className="flex-1 bg-transparent border-none outline-none text-[#8a919f] group-hover:text-[#e8eaf0] transition-colors text-xs"
                                            placeholder="Es: Trend H1 confermato?"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newTemplate = (config.checklistTemplate || []).filter((_, i) => i !== index);
                                                setConfig({ ...config, checklistTemplate: newTemplate });
                                            }}
                                            className="text-[#5a6272] hover:text-[#ff4d6a] transition-colors opacity-0 group-hover:opacity-100 p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const newTemplate = [...(config.checklistTemplate || []), ''];
                                    setConfig({ ...config, checklistTemplate: newTemplate });
                                }}
                                className="mx-6 my-6 p-3 rounded-xl border border-dashed border-white/10 hover:border-[#00d4aa]/30 hover:bg-[#00d4aa]/5 transition-all flex items-center gap-3 text-[#5a6272] hover:text-[#00d4aa] text-xs"
                            >
                                <Plus size={14} />
                                <span className="font-medium">Aggiungi voce checklist</span>
                            </button>
                        </div>
                    </div>

                    {/* REGOLE ATTIVE */}
                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="font-bold text-[10px] uppercase tracking-[0.2em] text-[#5a6272] flex items-center gap-3">
                                <div className="w-5 h-[1px] bg-[#5a6272]"></div>
                                Regole Attive
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedRules.length === AVAILABLE_RULES.length) {
                                        setSelectedRules([]);
                                    } else {
                                        setSelectedRules(AVAILABLE_RULES.map(r => r.id));
                                    }
                                }}
                                className="text-[10px] uppercase font-bold text-[#5a6272] hover:text-[#00d4aa] transition-colors"
                            >
                                {selectedRules.length === AVAILABLE_RULES.length ? 'Disattiva Tutti' : 'Attiva Tutti'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {AVAILABLE_RULES
                                .map(rule => {
                                    const isActive = selectedRules.includes(rule.id);
                                    return (
                                        <div
                                            key={rule.id}
                                            onClick={() => toggleRule(rule.id)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${isActive
                                                ? 'bg-[#00d4aa]/5 border-[#00d4aa]/20'
                                                : 'bg-[#181c21] border-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className={`absolute top-4 right-4 w-8 h-4.5 rounded-full border transition-all ${isActive
                                                ? 'bg-[#00d4aa]/20 border-[#00d4aa] after:left-[15px]'
                                                : 'bg-[#1e2329] border-white/10 after:left-[2px]'
                                                } after:content-[''] after:absolute after:top-[2px] after:w-3 after:h-3 after:rounded-full after:bg-[#5a6272] after:transition-all ${isActive ? 'after:bg-[#00d4aa]' : ''}`}></div>
                                            <div className={`font-medium text-[12px] mb-1 pr-10 ${isActive ? 'text-[#e8eaf0]' : 'text-[#8a919f]'}`}>{rule.label}</div>
                                            <div className="text-[10px] text-[#5a6272] leading-relaxed line-clamp-2">{rule.desc}</div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                </div >
            </div >

            {/* COMPACT FLOATING ACTION BAR - ABSOLUTE */}
            < div className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-auto min-w-[280px] max-w-[95%] z-[1000] animate-in fade-in slide-in-from-bottom-4 duration-500" >
                <div className="bg-[#111823]/95 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
                    <div className="flex items-center gap-3 pr-4 border-r border-white/5">
                        <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-[#00d4aa] shadow-[0_0_10px_rgba(0,212,170,0.6)]"></div>
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00d4aa] animate-ping opacity-30"></div>
                        </div>
                        <span className="text-[9px] text-[#e8eaf0] font-bold font-['DM_Mono'] uppercase tracking-[0.1em] opacity-60 whitespace-nowrap">Pronto</span>
                    </div>

                    <div className="flex items-center gap-4 pl-1">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="bg-[#00f2c3] hover:bg-[#00ffd0] transition-all text-[#000] px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-[0_5px_15_rgba(0,242,195,0.2)] hover:shadow-[0_8px_25_rgba(0,242,195,0.3)] active:scale-95 transition-transform flex items-center gap-2"
                        >
                            <Plus size={14} />
                            Crea Ciclo
                        </button>
                    </div>
                </div>
            </div >

            {/* CUSTOM FONT INJECTION */}
            < style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
                
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    transition: transform 0.1s;
                }
                
                input[type=range]:hover::-webkit-slider-thumb {
                    transform: scale(1.2);
                }
            `}} />

            {/* Simulator Overlay */}
            {showSimulator && (
                <MasaSimulator
                    initialConfig={config}
                    onClose={() => setShowSimulator(false)}
                />
            )}
        </div >
    );
};

export default NewMasanielloForm;
