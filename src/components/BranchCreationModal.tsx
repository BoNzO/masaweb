
import React, { useState } from 'react';
import { X, GitBranch } from 'lucide-react';
import ConfigurationPanel from './ConfigurationPanel';
import type { Config } from '../types/masaniello';

interface BranchCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (config: Config) => void;
    initialCapital: number;
    baseConfig: Config;
    suggestedTarget?: number;
}

const BranchCreationModal: React.FC<BranchCreationModalProps> = ({
    isOpen,
    onClose,
    onCreate,
    initialCapital,
    baseConfig,
    suggestedTarget
}) => {
    // Local config state, initialized with base config but overriding initialCapital
    const [localConfig, setLocalConfig] = useState<Config>({
        ...baseConfig,
        initialCapital: initialCapital
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-fuchsia-500/20 rounded-lg">
                            <GitBranch className="text-fuchsia-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Crea Nuovo Ramo</h2>
                            <p className="text-xs text-slate-400">Configura il nuovo piano derivato</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    <ConfigurationPanel
                        config={localConfig}
                        setConfig={setLocalConfig}
                        onStart={() => { }} // Not used here, we use custom footer buttons
                        suggestedTarget={suggestedTarget}
                    />
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-colors text-sm"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={() => onCreate(localConfig)}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold hover:from-fuchsia-500 hover:to-purple-500 transition-all shadow-lg shadow-fuchsia-900/20 text-sm flex items-center gap-2"
                    >
                        <GitBranch size={16} />
                        Crea Ramo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BranchCreationModal;
