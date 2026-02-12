import { useState } from 'react';
import { Settings, CheckCircle, RotateCcw, RefreshCw } from 'lucide-react';
import { useMasaniello } from './hooks/useMasaniello';
import Header from './components/Header';
import ConfigurationPanel from './components/ConfigurationPanel';
import StatsOverview from './components/StatsOverview';
import ActivePlan from './components/ActivePlan';
import AnalyticsSection from './components/AnalyticsSection';
import HistoryLog from './components/HistoryLog';
import { roundTwo } from './utils/mathUtils';
import type { ChartDataPoint } from './types/masaniello';

// RULES constant removed from top-level to be defined inside App for dynamic labels

const App = () => {
  const {
    config,
    setConfig,
    currentPlan,
    history,
    activeRules,
    toggleRule,
    sequence,
    isSequenceActive,
    startNewPlan,
    handleFullBet,
    handlePartialStep,
    activateRescueMode,
    resetAll,
    transitionToNextPlan,
    getNextStake,
    getRescueSuggestion,
  } = useMasaniello();

  const RULES = [
    { id: 'first_win', label: 'Vittoria inziale (Completa o Somma Parziali) → Chiusura ciclo' },
    { id: 'back_positive', label: 'Ritorno in positivo dopo negativo → Chiusura ciclo' },
    { id: 'profit_90', label: '90% utile netto raggiunto → Reset ciclo' },
    { id: 'all_wins', label: 'Tutte vittorie completate → Reset ciclo' },
    { id: 'impossible', label: 'Vittorie impossibili → Chiusura fallimento' },
    { id: 'auto_bank_100', label: 'Accantona al raggiungimento del 100% del target settimanale' },
    { id: 'smart_auto_close', label: 'Chiusura protettiva (>65% eventi e >90% capitale)' },
    {
      id: 'profit_milestone',
      label: `Profit Milestone: Accantona ${config.milestoneBankPercentage}% profitto totale ad ogni multiplo del capitale iniziale`,
    },
    {
      id: 'stop_loss',
      label: `Stop-Loss Ciclo: Chiudi automaticamente se il capitale scende del ${config.stopLossPercentage}%`,
    },
  ];

  const [showConfig, setShowConfig] = useState(!currentPlan);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

  const getRuleStatus = (ruleId: string) => {
    const isEnabled = activeRules.includes(ruleId);
    if (!currentPlan) return { active: false, enabled: isEnabled, isSuspended: false };

    const suspendedRules = ['first_win', 'back_positive', 'profit_90', 'smart_auto_close'];
    const isSuspended = currentPlan.isRescued && suspendedRules.includes(ruleId);

    const profitMade = currentPlan.currentCapital - currentPlan.startCapital;
    const profitThreshold = currentPlan.maxNetProfit * 0.9;
    const drawdown = (currentPlan.startCapital - currentPlan.currentCapital) / currentPlan.startCapital;
    let isActive = false;
    switch (ruleId) {
      case 'stop_loss':
        isActive = drawdown >= (config.stopLossPercentage / 100) * 0.8;
        break;
      case 'first_win':
        isActive = currentPlan.events.filter((e) => !e.isSystemLog).length === 0;
        break;
      case 'back_positive':
        isActive = currentPlan.wasNegative && currentPlan.currentCapital < currentPlan.startCapital - 0.01;
        break;
      case 'profit_90':
        isActive = profitMade >= profitThreshold * 0.8 && profitMade < profitThreshold;
        break;
      case 'all_wins':
        isActive = currentPlan.remainingWins <= 2 && currentPlan.remainingWins > 0;
        break;
      case 'impossible':
        isActive = currentPlan.remainingEvents - currentPlan.remainingWins <= 2;
        break;
    }
    return { active: isActive && !isSuspended, enabled: isEnabled, isSuspended };
  };

  const getStats = () => {
    const currentCapital = currentPlan ? currentPlan.currentCapital : 0;
    const totalBanked = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
    let absoluteStartCapital = config.initialCapital;
    if (history.length > 0) absoluteStartCapital = history[0].startCapital;
    else if (currentPlan) absoluteStartCapital = currentPlan.startCapital;

    const totalEventsPlayed =
      history.reduce((acc, p) => acc + (p.events ? p.events.filter((e) => !e.isSystemLog).length : 0), 0) +
      (currentPlan && currentPlan.events ? currentPlan.events.filter((e) => !e.isSystemLog).length : 0);
    const estimatedDays = Math.round(totalEventsPlayed * 0.4);

    const totalWins = history.reduce((acc, p) => acc + p.wins, 0) + (currentPlan ? currentPlan.wins : 0);
    const totalLosses = history.reduce((acc, p) => acc + p.losses, 0) + (currentPlan ? currentPlan.losses : 0);

    // EV Calculation: Sum of (1 / quota) for all events played
    const allPlayedEvents = [
      ...history.flatMap(p => p.events || []),
      ...(currentPlan?.events || [])
    ].filter(e => !e.isSystemLog && !e.isVoid);

    const expectedWinsTotal = allPlayedEvents.reduce((acc, e) => acc + (1 / (e.quota || config.quota)), 0);
    const evPerformance = expectedWinsTotal > 0 ? (totalWins / expectedWinsTotal) : 1;

    const totalWorth = currentCapital + totalBanked;
    const totalProfit = totalWorth - absoluteStartCapital;
    const totalGrowth = absoluteStartCapital > 0 ? (totalProfit / absoluteStartCapital) * 100 : 0;

    return {
      currentCapital,
      absoluteStartCapital,
      totalProfit,
      totalGrowth,
      totalWorth,
      totalBanked,
      estimatedDays,
      totalWins,
      totalLosses,
      expectedWinsTotal,
      evPerformance
    };
  };

  const getChartData = () => {
    const data: ChartDataPoint[] = [{ name: 'Start', capital: config.initialCapital, days: 0 }];
    let totalEvents = 0;

    history.forEach((plan, index) => {
      const planEvents = plan.events ? plan.events.filter((e) => !e.isSystemLog).length : 0;
      totalEvents += planEvents;
      const days = Math.round(totalEvents * 0.4);
      data.push({
        name: `Gen ${plan.generationNumber + 1}`,
        capital: roundTwo(plan.currentCapital),
        days: days,
        cycle: index + 1,
      });
    });

    if (currentPlan) {
      const currentEvents = currentPlan.events ? currentPlan.events.filter((e) => !e.isSystemLog).length : 0;
      const currentTotal = totalEvents + currentEvents;
      const days = Math.round(currentTotal * 0.4);
      data.push({
        name: 'Attuale',
        capital: roundTwo(currentPlan.currentCapital),
        days: days,
        cycle: history.length + 1,
      });
    }
    return data;
  };

  const getWeeklyHeatmapData = () => {
    const currentCapital = currentPlan ? currentPlan.currentCapital : config.initialCapital;
    const totalBanked = history.reduce((acc, p) => acc + (p.accumulatedAmount || 0), 0);
    let absoluteStartCapital = config.initialCapital;
    if (history.length > 0) absoluteStartCapital = history[0].startCapital;
    else if (currentPlan) absoluteStartCapital = currentPlan.startCapital;

    const totalProfit = currentCapital + totalBanked - absoluteStartCapital;
    const target = (config.weeklyTargetPercentage / 100) * (currentPlan?.startCapital || config.initialCapital);
    const yLevels = ['80-100%', '60-80%', '40-60%', '20-40%', '0-20%'];

    return new Array(12).fill(0).map((_, i) => {
      const bucketMin = i * target;
      let bucketProfit = 0;
      if (totalProfit > bucketMin) {
        bucketProfit = Math.min(totalProfit - bucketMin, target);
      }
      const percentage = (bucketProfit / target) * 100;
      return {
        key: `S${i + 1}`,
        percentage: percentage,
        data: yLevels.map((level, levelIdx) => {
          const thresholdPercent = (4 - levelIdx) * 20;
          const isActive = levelIdx === 4 ? percentage > 0.01 : percentage >= thresholdPercent;
          return { key: level, data: isActive ? 1 : 0 };
        }),
      };
    });
  };

  const stats = getStats();
  const weeklyTarget = (config.weeklyTargetPercentage / 100) * (currentPlan?.startCapital || config.initialCapital);

  const handleReset = () => {
    if (confirm('Sei sicuro di voler resettare tutto lo storico? La configurazione rimarrà invariata.')) {
      resetAll();
      setShowConfig(true);
    }
  };

  const handleCloseCycle = () => {
    if (!currentPlan) return;
    transitionToNextPlan(currentPlan, 'manual_close', 'manual_close');
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white min-h-screen">
      <Header />

      <StatsOverview
        totalWorth={stats.totalWorth}
        startCapital={currentPlan ? currentPlan.startCapital : config.initialCapital}
        absoluteStartCapital={stats.absoluteStartCapital}
        totalProfit={stats.totalProfit}
        totalGrowth={stats.totalGrowth}
        totalBanked={stats.totalBanked}
        totalWins={stats.totalWins}
        totalLosses={stats.totalLosses}
        estimatedDays={stats.estimatedDays}
        expectedWinsTotal={stats.expectedWinsTotal}
        evPerformance={stats.evPerformance}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-6">
          <AnalyticsSection
            chartData={getChartData()}
            heatmapData={getWeeklyHeatmapData()}
            weeklyTarget={weeklyTarget}
            weeklyTargetPercentage={config.weeklyTargetPercentage}
          />

          <div className="flex gap-3 mt-6 flex-wrap">
            <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              <Settings size={18} /> Config
            </button>
            {currentPlan && (
              <>
                <button onClick={handleCloseCycle} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  <CheckCircle size={18} /> Chiudi Ciclo
                </button>
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors">
                  <RotateCcw size={18} /> Reset Ciclo
                </button>
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          {currentPlan && (
            <ActivePlan
              currentPlan={currentPlan}
              isSequenceActive={isSequenceActive}
              sequence={sequence}
              activeRules={activeRules}
              rules={RULES}
              toggleRule={toggleRule}
              getRuleStatus={getRuleStatus}
              onFullBet={handleFullBet}
              onPartialStep={handlePartialStep}
              onActivateRescue={activateRescueMode}
              getNextStake={getNextStake}
              getRescueSuggestion={getRescueSuggestion}
            />
          )}
        </div>
      </div>

      {showConfig && (
        <ConfigurationPanel
          config={config}
          setConfig={setConfig}
          onStart={() => {
            startNewPlan();
            setShowConfig(false);
          }}
        />
      )}

      <div className="block lg:hidden mb-6">
        {currentPlan && (
          <ActivePlan
            currentPlan={currentPlan}
            isSequenceActive={isSequenceActive}
            sequence={sequence}
            activeRules={activeRules}
            rules={RULES}
            toggleRule={toggleRule}
            getRuleStatus={getRuleStatus}
            onFullBet={handleFullBet}
            onPartialStep={handlePartialStep}
            onActivateRescue={activateRescueMode}
            getNextStake={getNextStake}
            getRescueSuggestion={getRescueSuggestion}
          />
        )}
      </div>

      <HistoryLog history={history} expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory} />

      {!currentPlan && !showConfig && (
        <div className="bg-slate-800 p-12 rounded-lg text-center border border-slate-700 border-dashed">
          <RefreshCw size={48} className="mx-auto mb-4 text-slate-600 animate-spin-slow" />
          <h3 className="text-xl font-bold mb-2">Nessun Piano Attivo</h3>
          <p className="text-slate-400 mb-6">Configura i parametri per iniziare un nuovo ciclo</p>
          <button onClick={() => setShowConfig(true)} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition shadow-lg">
            Configura Piano
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
