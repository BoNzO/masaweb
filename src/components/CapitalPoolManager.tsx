import React, { useState } from 'react';
import { DollarSign, Plus, TrendingUp, History } from 'lucide-react';
import type { CapitalPool } from '../types/masaniello';

interface CapitalPoolManagerProps {
    pool: CapitalPool;
    onAddCapital: (amount: number) => void;
}

const CapitalPoolManager: React.FC<CapitalPoolManagerProps> = ({ pool, onAddCapital }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [amount, setAmount] = useState(1000);
    const [showHistory, setShowHistory] = useState(false);

    const handleAdd = () => {
        if (amount <= 0) {
            alert('Inserisci un importo valido');
            return;
        }
        onAddCapital(amount);
        setShowAddForm(false);
        setAmount(1000);
    };

    const totalAllocated = Object.values(pool.allocations).reduce((sum, val) => sum + val, 0);

    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                        <DollarSign size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Pool Capitale</h3>
                        <p className="text-xs text-slate-400">Gestione capitale comune</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={16} />
                    AGGIUNGI
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Disponibile</p>
                    <p className="text-lg font-black text-blue-400">€{pool.totalAvailable.toFixed(2)}</p>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Allocato</p>
                    <p className="text-lg font-black text-green-400">€{totalAllocated.toFixed(2)}</p>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Totale</p>
                    <p className="text-lg font-black text-white">€{(pool.totalAvailable + totalAllocated).toFixed(2)}</p>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mb-4">
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                        Importo da Aggiungere (€)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            min={1}
                            step={100}
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-bold transition-colors"
                        >
                            CONFERMA
                        </button>
                    </div>
                </div>
            )}

            {/* Allocations */}
            {Object.keys(pool.allocations).length > 0 && (
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Allocazioni Attive</h4>
                    <div className="space-y-2">
                        {Object.entries(pool.allocations).map(([masaId, allocated]) => (
                            <div key={masaId} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-2 border border-slate-700">
                                <span className="text-xs text-slate-300 font-bold">{masaId.replace('_', ' #').toUpperCase()}</span>
                                <span className="text-sm font-black text-green-400">€{allocated.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* History Toggle */}
            <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
                <History size={14} />
                {showHistory ? 'NASCONDI' : 'MOSTRA'} STORICO TRANSAZIONI
            </button>

            {/* Transaction History */}
            {showHistory && pool.history.length > 0 && (
                <div className="mt-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                        {pool.history.slice().reverse().map((tx) => (
                            <div key={tx.id} className="bg-slate-900/30 rounded-lg p-3 border border-slate-700">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-bold ${tx.type === 'allocation' ? 'text-green-400' :
                                            tx.type === 'release' ? 'text-blue-400' :
                                                'text-yellow-400'
                                        }`}>
                                        {tx.type === 'allocation' ? '+ ALLOCAZIONE' :
                                            tx.type === 'release' ? '↩ RILASCIO' :
                                                '⇄ TRASFERIMENTO'}
                                    </span>
                                    <span className="text-xs font-black text-white">€{tx.amount.toFixed(2)}</span>
                                </div>
                                <p className="text-[10px] text-slate-400">{tx.description}</p>
                                <p className="text-[9px] text-slate-500 mt-1">
                                    {new Date(tx.timestamp).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CapitalPoolManager;
