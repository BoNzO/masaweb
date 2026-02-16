import React, { useState } from 'react';
import { useMultiMasaniello } from './hooks/useMultiMasaniello';
import Header from './components/Header';
import AggregatedHeader from './components/AggregatedHeader';
import MasanielloTabs from './components/MasanielloTabs';
import OverviewDashboard from './components/OverviewDashboard';
import SingleMasanielloView from './components/SingleMasanielloView';
import NewMasanielloForm from './components/NewMasanielloForm';
import CapitalPoolManager from './components/CapitalPoolManager';
import { DollarSign } from 'lucide-react';

const App = () => {
  const {
    multiState,
    createMasaniello,
    archiveMasaniello,
    cloneMasaniello,
    addCapitalToPool,
    updateInstance,
    setCurrentView,
    aggregatedStats,
    canCreateNew
  } = useMultiMasaniello();

  const [showPoolManager, setShowPoolManager] = useState(false);

  // Initialize pool with some capital if empty
  React.useEffect(() => {
    if (multiState.capitalPool.totalAvailable === 0 && Object.keys(multiState.instances).length === 0) {
      addCapitalToPool(5000); // Initial pool capital
    }
  }, []);

  const currentView = multiState.currentViewId || 'overview';
  const currentInstance = currentView !== 'overview' && currentView !== 'new'
    ? multiState.instances[currentView]
    : null;

  const handleUpdateInstance = React.useCallback((id: string, updates: Partial<any>) => {
    updateInstance(id, updates);
  }, [updateInstance]);

  const handleArchiveInstance = React.useCallback((id: string) => {
    archiveMasaniello(id);
  }, [archiveMasaniello]);

  const handleCloneInstance = React.useCallback((id: string) => {
    cloneMasaniello(id);
  }, [cloneMasaniello]);

  return (
    <div className="w-full p-4 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white min-h-screen">
      <Header />

      {/* Aggregated Header (Always Visible) */}
      <AggregatedHeader
        stats={aggregatedStats}
        poolCapital={multiState.capitalPool.totalAvailable}
      />

      {/* Pool Manager Toggle */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowPoolManager(!showPoolManager)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <DollarSign size={16} />
          {showPoolManager ? 'NASCONDI' : 'GESTISCI'} POOL
        </button>
      </div>

      {/* Capital Pool Manager */}
      {showPoolManager && (
        <div className="mb-6">
          <CapitalPoolManager
            pool={multiState.capitalPool}
            onAddCapital={addCapitalToPool}
          />
        </div>
      )}

      {/* Masaniello Tabs */}
      <MasanielloTabs
        instances={multiState.instances}
        activeIds={multiState.activeInstanceIds}
        archivedIds={multiState.archivedInstanceIds}
        currentViewId={currentView}
        onSelectView={setCurrentView}
        canCreateNew={canCreateNew}
      />

      {/* Content Area */}
      <div className="mt-6">
        {currentView === 'overview' && (
          <OverviewDashboard stats={aggregatedStats} />
        )}

        {currentView === 'new' && (
          <NewMasanielloForm
            poolCapital={multiState.capitalPool.totalAvailable}
            onCreateMasaniello={createMasaniello}
          />
        )}

        {currentInstance && (
          <SingleMasanielloView
            key={currentInstance.id}
            instance={currentInstance}
            onUpdate={(updates) => handleUpdateInstance(currentInstance.id, updates)}
            onArchive={() => handleArchiveInstance(currentInstance.id)}
            onClone={() => handleCloneInstance(currentInstance.id)}
          />
        )}
      </div>

      {/* Help Text for First Time Users */}
      {multiState.activeInstanceIds.length === 0 && currentView === 'overview' && (
        <div className="mt-8 bg-blue-900/20 border border-blue-700/50 rounded-xl p-6 text-center">
          <h3 className="text-lg font-bold text-blue-300 mb-2">👋 Benvenuto nel Sistema Multi-Masaniello!</h3>
          <p className="text-sm text-slate-300 mb-4">
            Puoi gestire fino a 3 Masanielli contemporaneamente, ognuno con capitale e configurazione indipendenti.
          </p>
          <button
            onClick={() => setCurrentView('new')}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition-colors"
          >
            CREA IL TUO PRIMO MASANIELLO
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
