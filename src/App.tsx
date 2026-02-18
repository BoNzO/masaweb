import React, { useState } from 'react';
import { useMultiMasaniello } from './hooks/useMultiMasaniello';
import TopBar from './components/TopBar';
import MasanielloTabs from './components/MasanielloTabs';
import OverviewDashboard from './components/OverviewDashboard';
import SimplifiedMasanielloView from './components/SimplifiedMasanielloView';
import NewMasanielloForm from './components/NewMasanielloForm';
import CapitalPoolManager from './components/CapitalPoolManager';
import ConfigurationPanel from './components/ConfigurationPanel';

const App = () => {
  const {
    multiState,
    createMasaniello,
    archiveMasaniello,
    deleteMasaniello,
    cloneMasaniello,
    resetMasaniello,
    addCapitalToPool,
    setAvailableCapital,
    updateInstance,
    feedSlave,
    setCurrentView,
    aggregatedStats,
    canCreateNew,
    resetSystem
  } = useMultiMasaniello();

  const [showPoolManager, setShowPoolManager] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleToggleConfig = React.useCallback(() => {
    setShowConfig(prev => !prev);
  }, []);

  // Initialize pool with some capital if empty
  React.useEffect(() => {
    if (multiState.capitalPool.totalAvailable === 0 && Object.keys(multiState.instances).length === 0) {
      addCapitalToPool(5000); // Initial pool capital
    }
  }, []);

  // Add redesign class to body
  React.useEffect(() => {
    document.body.classList.add('redesign');
    return () => {
      document.body.classList.remove('redesign');
    };
  }, []);

  const currentView = multiState.currentViewId || 'overview';
  const currentInstance = currentView !== 'overview' && currentView !== 'new'
    ? multiState.instances[currentView]
    : null;

  const handleUpdateInstance = React.useCallback((id: string, updates: Partial<any>) => {
    updateInstance(id, updates);
  }, [updateInstance]);

  return (
    <>
      {/* Ambient glow blobs */}
      <div className="ambient ambient-1"></div>
      <div className="ambient ambient-2"></div>
      <div className="ambient ambient-3"></div>

      <div className="shell">
        {/* Top Bar */}
        <TopBar
          stats={aggregatedStats}
          poolCapital={multiState.capitalPool.totalAvailable}
          onTogglePool={() => setShowPoolManager(!showPoolManager)}
        />

        {/* Tabs */}
        <MasanielloTabs
          instances={multiState.instances}
          activeIds={multiState.activeInstanceIds}
          currentViewId={currentView}
          onSelectView={setCurrentView}
          canCreateNew={canCreateNew}
          onToggleConfig={handleToggleConfig}
          onReset={resetMasaniello}
          onClone={cloneMasaniello}
          onArchive={archiveMasaniello}
          onDelete={deleteMasaniello}
          onCloseCycle={archiveMasaniello} // Using archive as "Chiudi Ciclo"
        />

        {/* Main Content */}
        <main className="content">
          {/* 0. POOL MANAGER - ALWAYS AT TOP IF ENABLED */}
          {showPoolManager && (
            <div style={{ gridColumn: '1 / -1', marginBottom: '8px' }} className="animate-fade-up">
              <div className="card-redesign">
                <CapitalPoolManager
                  pool={multiState.capitalPool}
                  onAddCapital={addCapitalToPool}
                  onSetAvailable={setAvailableCapital}
                  onClose={() => setShowPoolManager(false)}
                />
              </div>
            </div>
          )}

          {/* 1. OVERVIEW VIEW - FULL WIDTH */}
          {currentView === 'overview' && (
            <div style={{ width: '100%', gridColumn: '1 / -1' }} className="animate-fade-up">
              {multiState.activeInstanceIds.length > 0 && (
                <OverviewDashboard
                  stats={aggregatedStats}
                  onReset={resetSystem}
                />
              )}

              {/* Help Text for First Time Users (if still on overview) */}
              {multiState.activeInstanceIds.length === 0 && (
                <div className="card-redesign animate-fade-up" style={{ animationDelay: '0.2s', marginTop: '24px' }}>
                  <div className="card-body-redesign" style={{ textAlign: 'center', padding: '48px 32px' }}>
                    <h3 className="font-display text-xl" style={{ color: 'var(--accent-blue)', marginBottom: '12px' }}>
                      👋 Benvenuto nel Sistema Multi-Masaniello!
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--txt-secondary)', marginBottom: '24px' }}>
                      Puoi gestire fino a 3 Masanielli contemporaneamente, ognuno con capitale e configurazione indipendenti.
                    </p>
                    <button
                      onClick={() => setCurrentView('new')}
                      className="btn btn-primary"
                      style={{ padding: '12px 32px', fontSize: '14px' }}
                    >
                      CREA IL TUO PRIMO MASANIELLO
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. INSTANCE VIEW */}
          {currentInstance && (
            showConfig ? (
              <div style={{ gridColumn: '1 / -1' }} className="animate-fade-up">
                <ConfigurationPanel
                  config={currentInstance.config}
                  setConfig={(newConfig) => updateInstance(currentInstance.id, { config: newConfig })}
                  onStart={() => setShowConfig(false)}
                  activeRules={currentInstance.activeRules}
                  toggleRule={(ruleId) => {
                    const rules = currentInstance.activeRules || [];
                    const newRules = rules.includes(ruleId)
                      ? rules.filter(id => id !== ruleId)
                      : [...rules, ruleId];
                    updateInstance(currentInstance.id, { activeRules: newRules });
                  }}
                />
              </div>
            ) : (
              <SimplifiedMasanielloView
                key={currentInstance.id}
                instance={currentInstance}
                onUpdate={(updates) => handleUpdateInstance(currentInstance.id, updates)}
                onFeed={(amount) => feedSlave(currentInstance.id, amount)}
              />
            )
          )}

          {/* 3. NEW MASANIELLO VIEW */}
          {currentView === 'new' && (
            <div className="left-col" style={{ gridColumn: '1 / -1' }}>
              <NewMasanielloForm
                poolCapital={multiState.capitalPool.totalAvailable}
                onCreateMasaniello={(config, cap, rules) => {
                  createMasaniello(config, cap, rules);
                  setShowConfig(false);
                  setShowPoolManager(false);
                }}
                activeInstances={multiState.activeInstanceIds.map(id => multiState.instances[id]).filter(Boolean)}
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default App;
