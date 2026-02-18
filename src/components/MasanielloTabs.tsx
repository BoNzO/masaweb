import React from 'react';
import { Crown, Link as LinkIcon } from 'lucide-react';
import type { MasanielloInstance } from '../types/masaniello';

interface MasanielloTabsProps {
    instances: { [id: string]: MasanielloInstance };
    activeIds: string[];
    currentViewId: string;
    onSelectView: (viewId: string) => void;
    canCreateNew: boolean;
    onToggleConfig?: () => void;
    onReset?: (id: string) => void;
    onClone?: (id: string) => void;
    onArchive?: (id: string) => void;
    onDelete?: (id: string) => void;
    onCloseCycle?: (id: string) => void;
}

const MasanielloTabs: React.FC<MasanielloTabsProps> = ({
    instances,
    activeIds,
    currentViewId,
    onSelectView,
    canCreateNew,
    onToggleConfig,
    onReset,
    onClone,
    onArchive,
    onDelete,
    onCloseCycle
}) => {
    const activeInstances = activeIds.map(id => instances[id]).filter(Boolean);

    return (
        <div className="tabs-bar">
            {/* Overview Tab */}
            <button
                onClick={() => onSelectView('overview')}
                className={`tab ${currentViewId === 'overview' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '10px 14px 11px', letterSpacing: '0.05em' }}
            >
                ⊞ Overview
            </button>

            {/* Active Masaniello Tabs */}
            {activeInstances.map(instance => {
                const role = instance.config.role || instance.currentPlan?.role || 'standard';
                const isMaster = role === 'master';
                const isSlave = role === 'slave';

                return (
                    <button
                        key={instance.id}
                        onClick={() => onSelectView(instance.id)}
                        className={`tab ${currentViewId === instance.id ? 'active' : ''}`}
                    >
                        {isMaster && <Crown size={12} />}
                        {isSlave && <LinkIcon size={12} />}
                        {instance.name}
                        {isMaster && <span className="tab-badge master">MASTER</span>}
                        {isSlave && <span className="tab-badge slave">SLAVE</span>}
                    </button>
                );
            })}

            {/* New Tab Button */}
            {canCreateNew && (
                <button
                    onClick={() => onSelectView('new')}
                    className="tab-add"
                    title="Nuovo ciclo"
                >
                    +
                </button>
            )}

            {/* Action Buttons (right side) */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '1px' }}>
                {currentViewId !== 'overview' && currentViewId !== 'new' && (
                    <>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => onToggleConfig?.()}
                        >
                            ⚙ Config
                        </button>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--accent-teal)' }}
                            onClick={() => onReset?.(currentViewId)}
                        >
                            ↺ Reset
                        </button>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => onClone?.(currentViewId)}
                        >
                            ⊡ Clona
                        </button>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => onArchive?.(currentViewId)}
                        >
                            ✦ Archivia
                        </button>
                        <button
                            className="btn btn-danger-soft"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => onDelete?.(currentViewId)}
                        >
                            ✕ Elimina
                        </button>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '6px 18px', fontSize: '12px' }}
                            onClick={() => onCloseCycle?.(currentViewId)}
                        >
                            ◎ Chiudi Ciclo
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MasanielloTabs;
