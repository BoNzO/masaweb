import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Settings,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Trophy,
  XCircle,
  PieChart,
  Coins,
  CheckSquare,
  Square,
  Target,
  AlertOctagon,
  Hash,
  ArrowRight,
  MinusCircle,
  Calculator,
  PiggyBank,
  Calendar,
  LifeBuoy,
  AlertTriangle,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const roundTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const MasanielloCompound = () => {
  const [config, setConfig] = useState({
    initialCapital: 1000,
    quota: 3.0,
    totalEvents: 14,
    expectedWins: 5,
    accumulationPercent: 0,
  });

  const [currentPlan, setCurrentPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [showConfig, setShowConfig] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [rescueEventsToAdd, setRescueEventsToAdd] = useState(2);

  // GESTIONE SEQUENZA PARZIALE
  const [sequence, setSequence] = useState([]);
  const [isSequenceActive, setIsSequenceActive] = useState(false);

  const [activeRules, setActiveRules] = useState([
    'first_win',
    'back_positive',
    'profit_90',
    'all_wins',
    'impossible',
  ]);

  const RULES = [
    {
      id: 'first_win',
      label: 'Vittoria inziale (Completa o Somma Parziali) → Chiusura ciclo',
    },
    {
      id: 'back_positive',
      label: 'Ritorno in positivo dopo negativo → Chiusura ciclo',
    },
    { id: 'profit_90', label: '90% utile netto raggiunto → Reset ciclo' },
    { id: 'all_wins', label: 'Tutte vittorie completate → Reset ciclo' },
    { id: 'impossible', label: 'Vittorie impossibili → Chiusura fallimento' },
  ];

  const toggleRule = (ruleId) => {
    setActiveRules((prev) =>
      prev.includes(ruleId)
        ? prev.filter((id) => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  useEffect(() => {
    setSequence([]);
    setIsSequenceActive(false);
  }, [history, currentPlan?.id]);

  // --- CALCOLI MATEMATICI ---
  const combinations = (n, k) => {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= n - i;
      result /= i + 1;
    }
    return Math.round(result);
  };

  const binomialPMF = (k, n, p) => {
    const coeff = combinations(n, k);
    return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
  };

  const binomialCDF = (k, n, p) => {
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      sum += binomialPMF(i, n, p);
    }
    return sum;
  };

  const calculateMaxNetProfit = (capital, totalEvents, expectedWins, quota) => {
    if (!capital || !totalEvents || !expectedWins || !quota || quota <= 1)
      return 0;

    const probability = 1 / quota;
    const cumulativeProb = binomialCDF(
      expectedWins - 1,
      totalEvents,
      probability
    );
    const successProb = 1 - cumulativeProb;

    if (successProb <= 0) return 0;

    const netProfit = capital / successProb - capital;
    return netProfit;
  };

  const calculateStake = (
    currentCapital,
    remainingEvents,
    remainingWins,
    quota,
    targetCapital
  ) => {
    if (remainingWins === 0) return 0;
    if (remainingEvents === 0) return 0;
    if (remainingWins > remainingEvents) return 0;
    if (remainingWins === remainingEvents) return currentCapital;

    const memo = {};
    const getRequiredCapital = (e, w) => {
      const key = `${e}_${w}`;
      if (memo[key] !== undefined) return memo[key];
      if (w === 0) return targetCapital;
      if (w > e || e === 0) return Infinity;
      if (w === e) {
        let cap = targetCapital;
        for (let i = 0; i < w; i++) cap = cap / quota;
        return cap;
      }
      const capIfWin = getRequiredCapital(e - 1, w - 1);
      const capIfLoss = getRequiredCapital(e - 1, w);
      if (capIfWin === Infinity || capIfLoss === Infinity) return Infinity;
      return capIfLoss + (capIfWin - capIfLoss) / quota;
    };

    const requiredCap = getRequiredCapital(remainingEvents, remainingWins);
    if (requiredCap === Infinity) return 0;
    const capIfWin = getRequiredCapital(remainingEvents - 1, remainingWins - 1);
    const capIfLoss = getRequiredCapital(remainingEvents - 1, remainingWins);
    if (capIfWin === Infinity || capIfLoss === Infinity) return 0;

    const theoreticalStake = (capIfWin - capIfLoss) / quota;
    const scalingFactor = requiredCap > 0 ? currentCapital / requiredCap : 1;
    const stake = theoreticalStake * scalingFactor;
    return Math.max(0, Math.min(stake, currentCapital));
  };

  // --- GESTIONE PIANO ---
  const createNewPlan = (startCapital = null) => {
    const capital =
      startCapital !== null ? startCapital : config.initialCapital;
    const maxProfit = calculateMaxNetProfit(
      capital,
      config.totalEvents,
      config.expectedWins,
      config.quota
    );
    return {
      id: Date.now(),
      startCapital: capital,
      currentCapital: capital,
      targetCapital: capital + maxProfit,
      maxNetProfit: maxProfit,
      quota: config.quota,
      totalEvents: config.totalEvents,
      expectedWins: config.expectedWins,
      events: [],
      remainingEvents: config.totalEvents,
      remainingWins: config.expectedWins,
      wins: 0,
      losses: 0,
      status: 'active',
      triggeredRule: null,
      wasNegative: false,
      accumulatedAmount: 0,
      isRescued: false,
      createdAt: new Date().toISOString(),
      generationNumber: currentPlan
        ? (currentPlan.generationNumber || 0) + 1
        : 0,
    };
  };

  const startNewPlan = () => {
    setCurrentPlan(createNewPlan());
    setShowConfig(false);
  };

  const transitionToNextPlan = (closingPlan, reason, ruleId) => {
    let amountToBank = 0;

    if (closingPlan.currentCapital > 0 && config.accumulationPercent > 0) {
      const theoreticalAmount =
        closingPlan.currentCapital * (config.accumulationPercent / 100);
      const maxBankable = closingPlan.currentCapital - closingPlan.startCapital;

      if (maxBankable > 0) {
        amountToBank = roundTwo(Math.min(theoreticalAmount, maxBankable));
      } else {
        amountToBank = 0;
      }
    }

    const nextCapital = roundTwo(closingPlan.currentCapital - amountToBank);

    const closedPlanWithStats = {
      ...closingPlan,
      status: reason,
      triggeredRule: ruleId,
      accumulatedAmount: amountToBank,
    };

    setHistory([...history, closedPlanWithStats]);
    setCurrentPlan(createNewPlan(nextCapital));
  };

  const resetCurrentPlan = () => {
    if (!currentPlan) return;
    transitionToNextPlan(currentPlan, 'manual_reset', 'manual_reset');
  };

  const closeCurrentCycle = () => {
    if (!currentPlan) return;
    transitionToNextPlan(currentPlan, 'manual_close', 'manual_close');
  };

  const resetAllCycles = () => {
    if (!window.confirm('Sei sicuro di voler resettare tutti i cicli?')) return;
    if (currentPlan)
      setHistory([
        ...history,
        {
          ...currentPlan,
          status: 'manual_reset',
          triggeredRule: 'manual_reset',
          accumulatedAmount: 0,
        },
      ]);
    setCurrentPlan(null);
    setHistory([]);
    setExpandedHistory(null);
    setShowConfig(true);
  };

  const resetPlan = (reason, ruleId, finalPlan) => {
    transitionToNextPlan(finalPlan, reason, ruleId);
  };

  // --- LOGICA SALVAGENTE (RESCUE) ---
  const activateRescueMode = () => {
    if (!currentPlan) return;
    const eventsToAdd = parseInt(rescueEventsToAdd);

    const rescueEventLog = {
      id: `RESCUE_${Date.now()}`,
      stake: 0,
      isWin: false,
      isVoid: true,
      isPartialSequence: false,
      isSystemLog: true,
      message: `SALVAGENTE ATTIVATO: +${eventsToAdd} Eventi`,
      capitalAfter: currentPlan.currentCapital,
      eventsLeft: currentPlan.remainingEvents + eventsToAdd,
      winsLeft: currentPlan.remainingWins,
      timestamp: new Date().toISOString(),
    };

    // Ricalcolo del target capital basato sulla nuova probabilità
    // Nota: Il target cambia perché cambiano le probabilità con lo stesso capitale corrente
    const newProfit = calculateMaxNetProfit(
      currentPlan.currentCapital,
      currentPlan.remainingEvents + eventsToAdd,
      currentPlan.remainingWins,
      currentPlan.quota
    );
    const newTarget = currentPlan.currentCapital + newProfit;

    const updatedPlan = {
      ...currentPlan,
      totalEvents: currentPlan.totalEvents + eventsToAdd,
      remainingEvents: currentPlan.remainingEvents + eventsToAdd,
      targetCapital: newTarget, // Aggiorniamo il target
      maxNetProfit: newProfit,
      isRescued: true,
      events: [...currentPlan.events, rescueEventLog],
    };

    setCurrentPlan(updatedPlan);
  };

  // Calcolo anteprima salvagente
  const rescueProjection = (() => {
    if (!currentPlan) return null;
    const added = parseInt(rescueEventsToAdd);
    const projectedProfit = calculateMaxNetProfit(
      currentPlan.currentCapital,
      currentPlan.remainingEvents + added,
      currentPlan.remainingWins,
      currentPlan.quota
    );
    const projectedTarget = currentPlan.currentCapital + projectedProfit;
    return {
      profit: projectedProfit,
      target: projectedTarget,
    };
  })();

  const getNextStake = () => {
    if (!currentPlan || currentPlan.status !== 'active') return 0;
    return calculateStake(
      currentPlan.currentCapital,
      currentPlan.remainingEvents,
      currentPlan.remainingWins,
      currentPlan.quota,
      currentPlan.targetCapital
    );
  };

  // --- LOGICA DI GIOCO ---
  const handlePartialStep = (isWin) => {
    if (!currentPlan) return;

    const fullStake = getNextStake();
    const halfStake = roundTwo(fullStake / 2);
    const stakeToUse = sequence.length === 0 ? halfStake : sequence[0].stake;

    const netResult = isWin
      ? stakeToUse * (currentPlan.quota - 1)
      : -stakeToUse;

    const newStep = { stake: stakeToUse, isWin, netResult };
    const newSequence = [...sequence, newStep];

    const intermediateCapital = roundTwo(
      currentPlan.currentCapital + netResult
    );

    const tempPlan = {
      ...currentPlan,
      currentCapital: intermediateCapital,
    };

    if (newSequence.length === 2) {
      finalizeSequence(newSequence, tempPlan);
    } else {
      setSequence(newSequence);
      setIsSequenceActive(true);
      setCurrentPlan(tempPlan);
    }
  };

  const handleFullBet = (isWin) => {
    if (!currentPlan) return;
    const fullStake = getNextStake();
    const netResult = isWin ? fullStake * (currentPlan.quota - 1) : -fullStake;
    const newCapital = roundTwo(currentPlan.currentCapital + netResult);
    const fullSequence = [{ stake: fullStake, isWin, netResult }];
    const tempPlan = { ...currentPlan, currentCapital: newCapital };
    finalizeSequence(fullSequence, tempPlan);
  };

  const finalizeSequence = (finalSequence, planState) => {
    let isFullWin = false;
    let isFullLoss = false;
    let isVoid = false;

    if (finalSequence.length === 1) {
      isFullWin = finalSequence[0].isWin;
      isFullLoss = !isFullWin;
    } else {
      const r1 = finalSequence[0].isWin;
      const r2 = finalSequence[1].isWin;
      if (r1 && r2) isFullWin = true;
      else if (!r1 && !r2) isFullLoss = true;
      else isVoid = true;
    }

    const totalStake = finalSequence.reduce((acc, step) => acc + step.stake, 0);
    const nextEventsLeft = isVoid
      ? planState.remainingEvents
      : planState.remainingEvents - 1;
    let nextWinsLeft = planState.remainingWins;
    if (isFullWin) nextWinsLeft -= 1;

    const nextTotalWins = isFullWin ? planState.wins + 1 : planState.wins;
    const nextTotalLosses = isFullLoss
      ? planState.losses + 1
      : planState.losses;

    const startCap = roundTwo(planState.startCapital);
    const isCurrentlyNegative = planState.currentCapital < startCap - 0.01;
    const wasNegativePersistent = planState.wasNegative || isCurrentlyNegative;

    const newEvent = {
      id: planState.events.filter((e) => !e.isSystemLog).length + 1,
      stake: totalStake,
      isWin: isFullWin,
      isVoid: isVoid,
      isPartialSequence: finalSequence.length > 1,
      sequenceDetails: finalSequence,
      capitalAfter: planState.currentCapital,
      eventsLeft: nextEventsLeft,
      winsLeft: nextWinsLeft,
      timestamp: new Date().toISOString(),
    };

    const finalPlan = {
      ...planState,
      events: [...planState.events, newEvent],
      remainingEvents: nextEventsLeft,
      remainingWins: nextWinsLeft,
      wins: nextTotalWins,
      losses: nextTotalLosses,
      wasNegative: wasNegativePersistent,
    };

    setSequence([]);
    setIsSequenceActive(false);

    if (!isVoid) {
      if (
        activeRules.includes('first_win') &&
        isFullWin &&
        planState.losses === 0
      ) {
        resetPlan('first_win_close', 'first_win', finalPlan);
        return;
      }
      if (
        activeRules.includes('back_positive') &&
        planState.wasNegative &&
        planState.currentCapital >= startCap - 0.01
      ) {
        resetPlan('back_positive_close', 'back_positive', finalPlan);
        return;
      }
      const profitMade = planState.currentCapital - startCap;
      if (
        activeRules.includes('profit_90') &&
        profitMade >= planState.maxNetProfit * 0.9
      ) {
        resetPlan('profit_90_reset', 'profit_90', finalPlan);
        return;
      }
      if (activeRules.includes('all_wins') && nextWinsLeft === 0) {
        resetPlan('completed', 'all_wins', finalPlan);
        return;
      }
      if (
        activeRules.includes('impossible') &&
        (nextEventsLeft < nextWinsLeft ||
          (nextEventsLeft === 0 && nextWinsLeft > 0))
      ) {
        finalPlan.status = 'failed';
        finalPlan.triggeredRule = 'impossible';
        setHistory([...history, finalPlan]);
        setCurrentPlan(null);
        return;
      }
    }

    setCurrentPlan(finalPlan);
  };

  const getProgressStats = () => {
    if (!currentPlan) return null;
    const eventsPlayed = currentPlan.totalEvents - currentPlan.remainingEvents;
    const structuralWins = currentPlan.expectedWins - currentPlan.remainingWins;
    const structuralLosses =
      currentPlan.totalEvents -
      currentPlan.expectedWins -
      (currentPlan.remainingEvents - currentPlan.remainingWins);
    const totalAllowedErrors =
      currentPlan.totalEvents - currentPlan.expectedWins;

    // Calcolo stato critico per Rescue Mode (80% perdite)
    const isCritical =
      structuralLosses >= totalAllowedErrors * 0.8 && totalAllowedErrors > 0;

    return {
      eventsPlayed,
      structuralWins,
      structuralLosses,
      totalAllowedErrors,
      isCritical,
    };
  };

  const progressStats = getProgressStats();

  const stats = (() => {
    const currentCapital = currentPlan
      ? currentPlan.currentCapital
      : config.initialCapital;

    const totalBanked = history.reduce(
      (acc, p) => acc + (p.accumulatedAmount || 0),
      0
    );

    let absoluteStartCapital = config.initialCapital;
    if (history.length > 0) {
      absoluteStartCapital = history[0].startCapital;
    } else if (currentPlan) {
      absoluteStartCapital = currentPlan.startCapital;
    }

    // CALCOLO GIORNI STIMATI
    const totalEventsPlayed =
      history.reduce(
        (acc, p) =>
          acc + (p.events ? p.events.filter((e) => !e.isSystemLog).length : 0),
        0
      ) +
      (currentPlan && currentPlan.events
        ? currentPlan.events.filter((e) => !e.isSystemLog).length
        : 0);
    const estimatedDays = Math.round(totalEventsPlayed * 0.4);

    const totalWorth = currentCapital + totalBanked;
    const totalProfit = totalWorth - absoluteStartCapital;
    const totalGrowth =
      absoluteStartCapital > 0 ? (totalProfit / absoluteStartCapital) * 100 : 0;

    return {
      currentCapital,
      absoluteStartCapital,
      totalProfit,
      totalGrowth,
      totalBanked,
      estimatedDays,
      completedCycles: history.filter((p) =>
        [
          'completed',
          'profit_90_reset',
          'first_win_close',
          'back_positive_close',
          'manual_close',
          'manual_reset',
        ].includes(p.status)
      ).length,
      totalCycles: history.length,
      totalWins:
        history.reduce((acc, p) => acc + p.wins, 0) +
        (currentPlan ? currentPlan.wins : 0),
      totalLosses:
        history.reduce((acc, p) => acc + p.losses, 0) +
        (currentPlan ? currentPlan.losses : 0),
    };
  })();

  const getRuleStatus = (ruleId) => {
    const isEnabled = activeRules.includes(ruleId);
    if (!currentPlan) return { active: false, enabled: isEnabled };
    const profitMade = currentPlan.currentCapital - currentPlan.startCapital;
    const profitThreshold = currentPlan.maxNetProfit * 0.9;
    let isActive = false;
    switch (ruleId) {
      case 'first_win':
        isActive =
          currentPlan.events.filter((e) => !e.isSystemLog).length === 0;
        break;
      case 'back_positive':
        isActive =
          currentPlan.wasNegative &&
          currentPlan.currentCapital < currentPlan.startCapital - 0.01;
        break;
      case 'profit_90':
        isActive =
          profitMade >= profitThreshold * 0.8 && profitMade < profitThreshold;
        break;
      case 'all_wins':
        isActive =
          currentPlan.remainingWins <= 2 && currentPlan.remainingWins > 0;
        break;
      case 'impossible':
        isActive = currentPlan.remainingEvents - currentPlan.remainingWins <= 2;
        break;
    }
    return { active: isActive, enabled: isEnabled };
  };

  const getChartData = () => {
    const data = [{ name: 'Start', capital: config.initialCapital, days: 0 }];
    let totalEvents = 0;

    history.forEach((plan, index) => {
      const planEvents = plan.events
        ? plan.events.filter((e) => !e.isSystemLog).length
        : 0;
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
      const currentEvents = currentPlan.events
        ? currentPlan.events.filter((e) => !e.isSystemLog).length
        : 0;
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs">
          <p className="font-bold text-slate-200 mb-1">
            {payload[0].payload.name}
          </p>
          <p className="text-slate-400">Giorno: {payload[0].payload.days}</p>
          <p className="text-green-400">
            Capitale: €{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  const targetStake = getNextStake();
  const partialBtnAmount = isSequenceActive
    ? sequence[0].stake
    : roundTwo(targetStake / 2);

  const previewProfit = calculateMaxNetProfit(
    config.initialCapital,
    config.totalEvents,
    config.expectedWins,
    config.quota
  );
  const previewTarget = config.initialCapital + previewProfit;
  const previewROI =
    config.initialCapital > 0
      ? (previewProfit / config.initialCapital) * 100
      : 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrendingUp className="text-green-400" />
          Masaniello con Interesse Composto
        </h1>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg">
          <div className="text-slate-400 text-xs mb-1">Capitale Corrente</div>
          <div className="text-xl font-bold text-green-400 flex items-center gap-2">
            €{stats.currentCapital.toFixed(2)}
            <span className="text-sm text-slate-500 font-normal">
              / €
              {currentPlan
                ? currentPlan.startCapital.toFixed(2)
                : config.initialCapital.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <Calendar size={12} />
            <span>Giorni trascorsi: {stats.estimatedDays}</span>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg">
          <div className="text-slate-400 text-xs mb-1">
            Profitto Totale (+Accantonato)
          </div>
          <div
            className={`text-xl font-bold ${
              stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {stats.totalProfit >= 0 ? '+' : ''}€{stats.totalProfit.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
            <span>
              Su Cap. Iniziale: €{stats.absoluteStartCapital.toFixed(2)}
            </span>
            <span
              className={`${
                stats.totalGrowth >= 0 ? 'text-green-400' : 'text-red-400'
              } font-bold`}
            >
              {stats.totalGrowth >= 0 ? '+' : ''}
              {stats.totalGrowth.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* BOX 3: ACCANTONAMENTO E STATISTICHE */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg relative overflow-hidden">
          <div className="flex flex-col h-full justify-between">
            <div className="mb-2">
              <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                <PiggyBank size={14} className="text-yellow-500" /> Capitale
                Accantonato
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                €{stats.totalBanked.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <Trophy size={14} className="text-green-500" />
                <span>{stats.totalWins} Vinte</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <XCircle size={14} className="text-red-500" />
                <span>{stats.totalLosses} Perse</span>
              </div>
            </div>
          </div>
          <Coins className="absolute top-2 right-2 text-yellow-500/10 w-16 h-16 pointer-events-none" />
        </div>
      </div>

      {/* HISTORY CHART */}
      {history.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6 shadow-lg h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getChartData()}>
              <defs>
                <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="days"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value}g`}
              />
              <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="capital"
                stroke="#4ade80"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCapital)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RULES */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
          <CheckCircle size={16} /> Regole Automatiche
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {RULES.map((rule) => {
            const status = getRuleStatus(rule.id);
            return (
              <div
                key={rule.id}
                onClick={() => toggleRule(rule.id)}
                className={`px-3 py-3 rounded text-sm flex items-center gap-3 cursor-pointer border select-none ${
                  status.enabled
                    ? status.active
                      ? 'bg-yellow-600/50 border-yellow-500 text-white'
                      : 'bg-slate-700/80 border-slate-600 text-slate-200'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}
              >
                {status.enabled ? (
                  status.active ? (
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                  ) : (
                    <CheckSquare size={16} className="text-green-400" />
                  )
                ) : (
                  <Square size={16} />
                )}
                <span
                  className={
                    !status.enabled ? 'line-through decoration-slate-600' : ''
                  }
                >
                  {rule.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTION BUTTONS (CONFIG) */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
        >
          <Settings size={18} /> Config
        </button>
        {currentPlan && (
          <>
            <button
              onClick={closeCurrentCycle}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <CheckCircle size={18} /> Chiudi Ciclo
            </button>
            <button
              onClick={resetCurrentPlan}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg"
            >
              <RotateCcw size={18} /> Reset Ciclo
            </button>
          </>
        )}
        <button
          onClick={resetAllCycles}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg ml-auto"
        >
          <Trash2 size={18} /> Reset Tutto
        </button>
      </div>

      {/* CONFIG PANEL CON ANTEPRIMA */}
      {showConfig && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6 animate-in fade-in">
          <h2 className="text-xl font-bold mb-4">Configurazione</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Capitale Iniziale
              </label>
              <input
                type="number"
                value={config.initialCapital}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    initialCapital: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Quota</label>
              <input
                type="number"
                step="0.1"
                value={config.quota}
                onChange={(e) =>
                  setConfig({ ...config, quota: parseFloat(e.target.value) })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Eventi Totali
              </label>
              <input
                type="number"
                value={config.totalEvents}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    totalEvents: parseInt(e.target.value),
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Vittorie Attese
              </label>
              <input
                type="number"
                value={config.expectedWins}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    expectedWins: parseInt(e.target.value),
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded p-2"
              />
            </div>
            {/* INPUT ACCANTONAMENTO */}
            <div className="col-span-2 bg-indigo-900/20 p-3 rounded border border-indigo-500/20">
              <label className="block text-sm text-indigo-300 mb-2 font-bold flex items-center gap-2">
                <PiggyBank size={16} /> Percentuale Accantonamento (fine ciclo)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={config.accumulationPercent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      accumulationPercent: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="font-bold w-16 text-right text-indigo-400">
                  {config.accumulationPercent}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Percentuale calcolata sul capitale finale. <br />
                <span className="text-yellow-500">
                  Nota: L'accantonamento è limitato al solo utile netto. Il
                  nuovo ciclo non partirà mai con un importo inferiore al
                  capitale di partenza del ciclo precedente.
                </span>
              </p>
            </div>
          </div>

          {/* BOX ANTEPRIMA RENDIMENTO */}
          <div className="mt-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
            <h3 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">
              <Calculator size={16} /> Anteprima Rendimento (Singolo Ciclo)
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-400">Capitale Target</div>
                <div className="font-bold text-green-400">
                  €
                  {isNaN(previewTarget)
                    ? '---'
                    : roundTwo(previewTarget).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Utile Netto</div>
                <div className="font-bold text-green-400">
                  €
                  {isNaN(previewProfit)
                    ? '---'
                    : roundTwo(previewProfit).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Rendimento %</div>
                <div className="font-bold text-indigo-400">
                  {isNaN(previewROI) ? '---' : roundTwo(previewROI).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={startNewPlan}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
          >
            Avvia Piano
          </button>
        </div>
      )}

      {/* ACTIVE PLAN */}
      {currentPlan && progressStats && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6 shadow-xl">
          {/* RESCUE MODE BANNER - appare solo se critico */}
          {progressStats.isCritical && !currentPlan.isRescued && (
            <div className="relative mb-6 -mx-6 -mt-6 bg-red-600 text-white p-4 rounded-t-lg shadow-md animate-in slide-in-from-top-2">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <AlertTriangle size={24} className="text-yellow-300" />
                    SOGLIA CRITICA (80% Perdite)
                  </div>
                  <div className="text-sm text-red-100 opacity-90 mt-1">
                    Rischio fallimento elevato. Attiva il salvagente per ridurre
                    la varianza.
                  </div>
                </div>

                <div className="bg-red-800/50 p-3 rounded border border-red-500/50 flex flex-col gap-2 min-w-[300px]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Target Attuale:</span>
                    <span className="font-bold">
                      €{currentPlan.targetCapital.toFixed(2)}
                    </span>
                  </div>
                  {rescueProjection && (
                    <div className="flex justify-between items-center text-sm text-yellow-300">
                      <span className="flex items-center gap-1">
                        <ArrowDownRight size={14} /> Nuovo Target:
                      </span>
                      <span className="font-bold text-lg">
                        €{rescueProjection.target.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="h-px bg-red-500/50 my-1"></div>
                  <div className="flex gap-2 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase">
                        Aggiungi:
                      </span>
                      <select
                        value={rescueEventsToAdd}
                        onChange={(e) => setRescueEventsToAdd(e.target.value)}
                        className="bg-white text-red-700 border-0 rounded px-2 py-1 text-sm font-bold outline-none cursor-pointer"
                      >
                        <option value="1">+1 Evento</option>
                        <option value="2">+2 Eventi</option>
                        <option value="3">+3 Eventi</option>
                        <option value="4">+4 Eventi</option>
                        <option value="5">+5 Eventi</option>
                      </select>
                    </div>
                    <button
                      onClick={activateRescueMode}
                      className="bg-yellow-400 hover:bg-yellow-300 text-red-900 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shadow transition-colors"
                    >
                      <LifeBuoy size={16} /> ATTIVA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPlan.isRescued && (
            <div className="absolute top-4 right-4 bg-orange-600/20 border border-orange-500 text-orange-200 px-3 py-1 rounded text-xs font-bold flex items-center gap-2">
              <LifeBuoy size={14} /> SALVAGENTE ATTIVO
            </div>
          )}

          <div className="flex justify-between items-center mb-4 mt-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Piano Attivo
              {currentPlan.isRescued && (
                <span className="text-xs text-orange-400 border border-orange-500 rounded px-1">
                  MODIFICATO
                </span>
              )}
            </h2>
            <div className="text-sm px-3 py-1 bg-blue-900/50 rounded border border-blue-800">
              {currentPlan.remainingEvents}E / {currentPlan.remainingWins}V
              {currentPlan.wasNegative &&
                currentPlan.currentCapital <
                  currentPlan.startCapital - 0.01 && (
                  <span className="ml-2 text-red-300 bg-red-900/50 px-2 rounded text-xs">
                    In negativo
                  </span>
                )}
            </div>
          </div>

          {/* DASHBOARD */}
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-900/50 p-4 rounded-lg border ${
              progressStats.isCritical
                ? 'border-red-500/50'
                : 'border-slate-700'
            }`}
          >
            <div>
              <div className="text-slate-400 text-xs">Quota / Cap.</div>
              <div className="font-bold text-lg">
                @{currentPlan.quota} | €{currentPlan.startCapital}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Eventi</span>
                <span>
                  {progressStats.eventsPlayed} / {currentPlan.totalEvents}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-700 rounded-full mt-1">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${
                      (progressStats.eventsPlayed / currentPlan.totalEvents) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Vittorie</span>
                <span className="text-green-400">
                  {progressStats.structuralWins} / {currentPlan.expectedWins}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-700 rounded-full mt-1">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${
                      (progressStats.structuralWins /
                        currentPlan.expectedWins) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Errori</span>
                <span
                  className={
                    progressStats.isCritical
                      ? 'text-red-500 font-bold animate-pulse'
                      : 'text-red-400'
                  }
                >
                  {progressStats.structuralLosses} /{' '}
                  {progressStats.totalAllowedErrors}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-700 rounded-full mt-1">
                <div
                  className={`h-full ${
                    progressStats.isCritical ? 'bg-red-600' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${
                      (progressStats.structuralLosses /
                        progressStats.totalAllowedErrors) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* BETTING BOX */}
          <div
            className={`p-6 rounded-lg mb-4 shadow-lg relative overflow-hidden transition-colors duration-300 ${
              isSequenceActive
                ? 'bg-gradient-to-r from-indigo-900 to-slate-800 border border-indigo-500/50'
                : 'bg-gradient-to-r from-blue-600 to-blue-700'
            }`}
          >
            <div className="relative z-10">
              <div className="text-sm text-blue-100/80 mb-1 font-medium tracking-wider flex justify-between items-center">
                <span>
                  {isSequenceActive
                    ? `SEQUENZA PARZIALE (STEP ${sequence.length + 1}/2)`
                    : 'PROSSIMA PUNTATA (100%)'}
                </span>
              </div>
              <div className="text-4xl font-bold tracking-tight text-white">
                €
                {isSequenceActive
                  ? sequence[0].stake.toFixed(2)
                  : targetStake.toFixed(2)}
                {isSequenceActive && (
                  <span className="text-lg text-indigo-300 ml-2 font-normal">
                    / quota 50%
                  </span>
                )}
              </div>

              {/* Sequence Visualizer */}
              {isSequenceActive && (
                <div className="flex gap-2 mt-4">
                  {sequence.map((step, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded text-xs font-bold border ${
                        step.isWin
                          ? 'bg-green-500/20 border-green-500 text-green-300'
                          : 'bg-red-500/20 border-red-500 text-red-300'
                      }`}
                    >
                      {idx + 1}°: {step.isWin ? 'VINTO' : 'PERSO'}
                    </span>
                  ))}
                  <span className="px-3 py-1 rounded text-xs font-bold border border-white/30 text-white/50 animate-pulse">
                    2°: In attesa...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {!isSequenceActive ? (
              // MODE STANDARD: VINTA 50% / PERSA 50%
              <>
                <button
                  onClick={() => handleFullBet(true)}
                  className="py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg shadow-lg"
                >
                  VINTA (100%)
                </button>
                <button
                  onClick={() => handlePartialStep(true)}
                  className="py-4 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-lg shadow-lg flex flex-col items-center justify-center leading-tight text-white"
                >
                  <span>VINTA 50%</span>
                  <span className="text-xs font-normal opacity-90 mt-1">
                    Importo: €{partialBtnAmount.toFixed(2)}
                  </span>
                </button>
                <button
                  onClick={() => handleFullBet(false)}
                  className="py-4 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-lg shadow-lg col-span-1"
                >
                  PERSA (100%)
                </button>
                <button
                  onClick={() => handlePartialStep(false)}
                  className="py-4 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-lg shadow-lg flex flex-col items-center justify-center leading-tight text-white"
                >
                  <span>PERSA 50%</span>
                  <span className="text-xs font-normal opacity-90 mt-1">
                    Importo: €{partialBtnAmount.toFixed(2)}
                  </span>
                </button>
              </>
            ) : (
              // MODE SEQUENZA ATTIVA
              <>
                <button
                  onClick={() => handlePartialStep(true)}
                  className="py-6 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-xl shadow-lg flex flex-col items-center justify-center text-white"
                >
                  <span>2° VINTA</span>
                  <span className="text-xs opacity-90 font-normal mt-1">
                    Importo: €{partialBtnAmount.toFixed(2)}
                  </span>
                </button>
                <button
                  onClick={() => handlePartialStep(false)}
                  className="py-6 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-xl shadow-lg flex flex-col items-center justify-center text-white"
                >
                  <span>2° PERSA</span>
                  <span className="text-xs opacity-90 font-normal mt-1">
                    Importo: €{partialBtnAmount.toFixed(2)}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* EVENTS LIST */}
          <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-700">
            <h3 className="font-bold mb-3 text-sm text-slate-300">
              Eventi ({currentPlan.events.filter((e) => !e.isSystemLog).length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {[...currentPlan.events].reverse().map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded flex justify-between items-center ${
                    event.isSystemLog
                      ? 'bg-orange-900/40 border border-orange-500/50 text-orange-200'
                      : event.isVoid
                      ? 'bg-slate-600/30 border-l-4 border-slate-500 text-slate-300'
                      : event.isWin
                      ? 'bg-green-900/20 border-l-4 border-green-500'
                      : 'bg-red-900/20 border-l-4 border-red-500'
                  }`}
                >
                  {event.isSystemLog ? (
                    <div className="w-full flex justify-between items-center">
                      <span className="font-bold text-sm flex items-center gap-2">
                        <LifeBuoy size={16} /> {event.message}
                      </span>
                      <span className="text-xs">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          #{event.id} -{' '}
                          {event.isVoid
                            ? 'NULLO (VOID)'
                            : event.isWin
                            ? 'VINTO'
                            : 'PERSO'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex gap-2">
                          {event.isPartialSequence &&
                            event.sequenceDetails &&
                            event.sequenceDetails.map((part, i) => (
                              <span
                                key={i}
                                className={`px-1.5 rounded text-[10px] border ${
                                  part.isWin
                                    ? 'border-green-500/50 text-green-300'
                                    : 'border-red-500/50 text-red-300'
                                }`}
                              >
                                {part.isWin ? 'W' : 'L'}
                              </span>
                            ))}
                          {!event.isPartialSequence && (
                            <span>Puntata: €{event.stake.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          €{event.capitalAfter.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {event.isPartial ? (
                            <span className="text-indigo-300">
                              In attesa risoluzione...
                            </span>
                          ) : (
                            `${event.eventsLeft} rim. / ${event.winsLeft} vitt. rim.`
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Storico ({history.length})</h2>
          <div className="space-y-3">
            {[...history].reverse().map((plan) => {
              const profit = plan.currentCapital - plan.startCapital;
              const isExpanded = expandedHistory === plan.id;
              return (
                <div
                  key={plan.id}
                  className="bg-slate-700 rounded-lg overflow-hidden"
                >
                  <div
                    onClick={() =>
                      setExpandedHistory(isExpanded ? null : plan.id)
                    }
                    className="p-4 cursor-pointer hover:bg-slate-600/50 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        Gen. {plan.generationNumber + 1}{' '}
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                        {plan.isRescued && (
                          <LifeBuoy size={14} className="text-orange-400" />
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {plan.wins}V / {plan.losses}L
                      </div>
                      <div className="text-xs text-slate-300 bg-slate-800/50 px-2 py-1 rounded inline-block">
                        €{plan.startCapital.toFixed(2)} → €
                        {plan.currentCapital.toFixed(2)}
                        {plan.accumulatedAmount > 0 && (
                          <span className="text-yellow-400 ml-2">
                            (Bank: €{plan.accumulatedAmount})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          profit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {profit >= 0 ? '+' : ''}€{profit.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {plan.triggeredRule || plan.status}
                      </div>
                    </div>
                  </div>
                  {isExpanded && plan.events && (
                    <div className="px-4 pb-4 border-t border-slate-600 bg-slate-700/50 mt-2 pt-2">
                      {plan.events
                        .filter((e) => !e.isSystemLog)
                        .map((ev) => (
                          <div
                            key={ev.id}
                            className="text-sm flex justify-between py-1 border-b border-slate-600/30 last:border-0"
                          >
                            <span
                              className={
                                ev.isVoid
                                  ? 'text-slate-400'
                                  : ev.isWin
                                  ? 'text-green-300'
                                  : 'text-red-300'
                              }
                            >
                              #{ev.id}{' '}
                              {ev.isVoid ? 'VOID' : ev.isWin ? 'WIN' : 'LOSS'}
                            </span>
                            <span>€{ev.capitalAfter.toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!currentPlan && (
        <div className="bg-slate-800 p-12 rounded-lg text-center border border-slate-700 border-dashed">
          <RefreshCw
            size={48}
            className="mx-auto mb-4 text-slate-600 animate-spin-slow"
          />
          <h3 className="text-xl font-bold mb-2">Nessun Piano Attivo</h3>
          <p className="text-slate-400 mb-6">
            Configura i parametri per iniziare un nuovo ciclo
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition shadow-lg"
          >
            Configura Piano
          </button>
        </div>
      )}
    </div>
  );
};

export default MasanielloCompound;
