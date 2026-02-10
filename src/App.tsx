import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Settings,
  TrendingDown,
  History as HistoryIcon,
  RotateCcw,
  RefreshCw,
  XCircle,
  AlertTriangle,
  ArrowDownRight,
  Target,
  PiggyBank,
  Coins,
  Trophy,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CheckSquare,
  Square,
  Hash,
  Calculator,
  LifeBuoy,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// --- TYPES ---
interface Config {
  initialCapital: number;
  quota: number;
  totalEvents: number;
  expectedWins: number;
  accumulationPercent: number;
  weeklyTargetPercentage: number;
}

interface EventDetail {
  stake: number;
  isWin: boolean;
  netResult: number;
}

interface MasaEvent {
  id: number | string;
  stake: number;
  isWin: boolean;
  isVoid: boolean;
  isPartialSequence: boolean;
  sequenceDetails?: EventDetail[];
  capitalAfter: number;
  eventsLeft: number;
  winsLeft: number;
  timestamp: string;
  isSystemLog?: boolean;
  message?: string;
  quota?: number;
}

interface MasaPlan {
  id: number;
  startCapital: number;
  currentCapital: number;
  targetCapital: number;
  maxNetProfit: number;
  quota: number;
  totalEvents: number;
  expectedWins: number;
  events: MasaEvent[];
  remainingEvents: number;
  remainingWins: number;
  wins: number;
  losses: number;
  status: string;
  triggeredRule: string | null;
  wasNegative: boolean;
  accumulatedAmount: number;
  isRescued: boolean;
  createdAt: string;
  generationNumber: number;
  milestonesBanked?: number;
}

interface ChartDataPoint {
  name: string;
  capital: number;
  days: number;
  cycle?: number;
}

const roundTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const nCr = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n / 2) k = n - k;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return res;
};

const calculateMaxNetProfit = (startCapital: number, n: number, k: number, p: number): number => {
  let denominator = 0;
  for (let i = k; i <= n; i++) {
    denominator += nCr(n, i) * Math.pow(p - 1, n - i);
  }
  const totalPayout = (startCapital * Math.pow(p, n)) / denominator;
  return totalPayout - startCapital;
};

const MasanielloCompound = () => {
  const [config, setConfig] = useState<Config>(() => {
    const saved = localStorage.getItem('masa_config');
    const defaultConfig: Config = {
      initialCapital: 1000,
      quota: 3.0,
      totalEvents: 14,
      expectedWins: 5,
      accumulationPercent: 10,
      weeklyTargetPercentage: 10,
    };
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
  });

  const [currentPlan, setCurrentPlan] = useState<MasaPlan | null>(() => {
    const saved = localStorage.getItem('masa_current_plan');
    return saved ? JSON.parse(saved) : null;
  });

  const [history, setHistory] = useState<MasaPlan[]>(() => {
    const saved = localStorage.getItem('masa_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [showConfig, setShowConfig] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [rescueEventsToAdd, setRescueEventsToAdd] = useState(2);
  const [sequence, setSequence] = useState<any[]>([]);
  const [isSequenceActive, setIsSequenceActive] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);

  const [activeRules, setActiveRules] = useState(() => {
    const saved = localStorage.getItem('masa_active_rules');
    return saved ? JSON.parse(saved) : [
      'first_win',
      'back_positive',
      'profit_90',
      'all_wins',
      'impossible',
      'auto_bank_100',
    ];
  });

  useEffect(() => {
    localStorage.setItem('masa_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('masa_current_plan', JSON.stringify(currentPlan));
  }, [currentPlan]);

  useEffect(() => {
    localStorage.setItem('masa_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('masa_active_rules', JSON.stringify(activeRules));
  }, [activeRules]);

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
    {
      id: 'auto_bank_100',
      label: 'Accantona al raggiungimento del 100% del target settimanale',
    },
    {
      id: 'smart_auto_close',
      label: 'Chiusura protettiva (>65% eventi e >90% capitale)',
    },
  ];

  const toggleRule = (ruleId: string) => {
    setActiveRules((prev: string[]) =>
      prev.includes(ruleId)
        ? prev.filter((id: string) => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  useEffect(() => {
    setSequence([]);
    setIsSequenceActive(false);
  }, [history, currentPlan?.id]);



  const calculateStake = (
    currentCapital: number,
    remainingEvents: number,
    remainingWins: number,
    quota: number,
    targetCapital: number
  ): number => {
    if (remainingWins === 0) return 0;
    if (remainingEvents === 0) return 0;
    if (remainingWins > remainingEvents) return 0;
    if (remainingWins === remainingEvents) return currentCapital;

    const memo: Record<string, number> = {};
    const getRequiredCapital = (e: number, w: number): number => {
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
  const createNewPlan = (startCapital: number | null = null): MasaPlan => {
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

  const transitionToNextPlan = (closingPlan: MasaPlan, reason: string, ruleId: string | null) => {
    let amountToBank = 0;
    let milestonesBanked = 0;

    const cycleProfit = roundTwo(closingPlan.currentCapital - closingPlan.startCapital);

    // Cumulative Milestone Banking logic
    if (reason === 'auto_bank_100' && config.accumulationPercent > 0 && cycleProfit > 0) {
      // 1. Calculate how many milestones we've banked so far
      const bankedMilestoneCountBefore = history.reduce(
        (acc: number, p: MasaPlan) => acc + (p.milestonesBanked || (p.status === 'auto_bank_100' ? 1 : 0)),
        0
      );

      // 2. Calculate how many milestones we are at right now (cumulative profit)
      const totalBankedSoFar = history.reduce((acc: number, p: MasaPlan) => acc + (p.accumulatedAmount || 0), 0);
      let absoluteStartCap = config.initialCapital;
      if (history.length > 0) absoluteStartCap = history[0].startCapital;

      const currentTotalProfit = roundTwo(closingPlan.currentCapital + totalBankedSoFar - absoluteStartCap);
      const targetValue = (config.weeklyTargetPercentage / 100) * (closingPlan?.startCapital || config.initialCapital);
      const targetMilestoneCount = Math.floor(currentTotalProfit / targetValue);

      // 3. Bank for ALL pending milestones, but limited by THIS cycle's profit
      const milestonesToBankNow = Math.max(0, targetMilestoneCount - bankedMilestoneCountBefore);

      if (milestonesToBankNow > 0) {
        // Calculate amount: milestones * target * percentage
        // But we can't bank more than the cycle profit
        const theoreticalAmount = milestonesToBankNow * targetValue * (config.accumulationPercent / 100);
        amountToBank = Math.min(cycleProfit, roundTwo(theoreticalAmount));

        // If we limited by cycleProfit, calculate how many milestones we ACTUALLY covered
        // Actually, if we bank less money, we still count the milestones as "hit"
        // because the rule won't trigger again unless profit increases further.
        milestonesBanked = milestonesToBankNow;
      }
    }

    const nextCapital = roundTwo(closingPlan.currentCapital - amountToBank);

    const closedPlanWithStats: MasaPlan = {
      ...closingPlan,
      status: reason,
      triggeredRule: ruleId,
      accumulatedAmount: amountToBank,
      milestonesBanked: milestonesBanked,
    };

    setHistory([...history, closedPlanWithStats]);
    setCurrentPlan(createNewPlan(nextCapital));
  };

  const resetCurrentPlan = () => {
    if (confirm('Sei sicuro di voler resettare tutto lo storico? La configurazione rimarrà invariata.')) {
      setHistory([]);
      setCurrentPlan(null);
      setIsSequenceActive(false);
      setSequence([]);
      setShowConfig(true);
    }
  };

  const closeCurrentCycle = () => {
    if (!currentPlan) return;
    transitionToNextPlan(currentPlan, 'manual_close', 'manual_close');
  };


  const resetPlan = (reason: string, ruleId: string | null, finalPlan: MasaPlan) => {
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
  const handlePartialStep = (isWin: boolean) => {
    if (!currentPlan) return;

    const fullStake = getNextStake();
    const halfStake = roundTwo(fullStake / 2);
    const stakeToUse = sequence.length === 0 ? halfStake : sequence[0].stake;

    const netResult = isWin
      ? stakeToUse * (currentPlan.quota - 1)
      : -stakeToUse;

    const newStep: EventDetail = { stake: stakeToUse, isWin, netResult };
    const newSequence = [...sequence, newStep];

    const intermediateCapital = roundTwo(
      currentPlan.currentCapital + netResult
    );

    const tempPlan: MasaPlan = {
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

  const finalizeSequence = (finalSequence: EventDetail[], planState: MasaPlan) => {
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

    const totalStake = finalSequence.reduce((acc: number, step: EventDetail) => acc + step.stake, 0);
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

    const newEvent: MasaEvent = {
      id: planState.events.filter((e: MasaEvent) => !e.isSystemLog).length + 1,
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

    const finalPlan: MasaPlan = {
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
      // 1. PRIORITY: Cumulative Milestone Banking logic
      const totalBankedSoFar = history.reduce(
        (acc: number, p: MasaPlan) => acc + (p.accumulatedAmount || 0),
        0
      );

      let absoluteStartCap = config.initialCapital;
      if (history.length > 0) {
        absoluteStartCap = history[0].startCapital;
      } else if (finalPlan) {
        absoluteStartCap = finalPlan.startCapital;
      }

      const currentTotalProfit = roundTwo(
        finalPlan.currentCapital + totalBankedSoFar - absoluteStartCap
      );

      const bankedMilestoneCount = history.reduce(
        (acc, p) => acc + (p.milestonesBanked || (p.status === 'auto_bank_100' ? 1 : 0)),
        0
      );

      const targetValue = (config.weeklyTargetPercentage / 100) * (currentPlan?.startCapital || config.initialCapital);
      const targetMilestoneCount = Math.floor(currentTotalProfit / targetValue);

      // CRITICAL FIX: Only trigger auto-bank if:
      // 1. We have pending milestones
      // 2. We just had a WIN (progress) or the cycle is already significantly profitable
      const cycleProfit = finalPlan.currentCapital - finalPlan.startCapital;

      if (
        activeRules.includes('auto_bank_100') &&
        targetMilestoneCount > bankedMilestoneCount &&
        targetValue > 0 &&
        isFullWin && // Specifically: only trigger forced exit AFTER A WIN
        cycleProfit > 0.01
      ) {
        resetPlan('auto_bank_100', 'auto_bank_100', finalPlan);
        return;
      }

      // 2. PRIORITY: Failure/Impossible situations
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

      // 3. PRIORITY: Standard close rules
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

      // 4. Smart Auto-Close Rule
      const eventsPlayed = finalPlan.totalEvents - nextEventsLeft;
      const progressPercent = eventsPlayed / finalPlan.totalEvents;
      const capitalRetention = finalPlan.currentCapital / finalPlan.startCapital;

      if (
        activeRules.includes('smart_auto_close') &&
        progressPercent > 0.65 &&
        capitalRetention > 0.90
      ) {
        resetPlan('smart_auto_close', 'smart_auto_close', finalPlan);
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
    const currentCapital = currentPlan ? currentPlan.currentCapital : 0;

    const totalBanked = history.reduce(
      (acc: number, p: MasaPlan) => acc + (p.accumulatedAmount || 0),
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
        (acc: number, p: MasaPlan) =>
          acc + (p.events ? p.events.filter((e: MasaEvent) => !e.isSystemLog).length : 0),
        0
      ) +
      (currentPlan && currentPlan.events
        ? currentPlan.events.filter((e: MasaEvent) => !e.isSystemLog).length
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
      totalWorth,
      totalBanked,
      estimatedDays,
      completedCycles: history.filter((p: MasaPlan) =>
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
        history.reduce((acc: number, p: MasaPlan) => acc + p.wins, 0) +
        (currentPlan ? currentPlan.wins : 0),
      totalLosses:
        history.reduce((acc: number, p: MasaPlan) => acc + p.losses, 0) +
        (currentPlan ? currentPlan.losses : 0),
    };
  })();

  const getRuleStatus = (ruleId: string) => {
    const isEnabled = activeRules.includes(ruleId);
    if (!currentPlan) return { active: false, enabled: isEnabled };
    const profitMade = currentPlan.currentCapital - currentPlan.startCapital;
    const profitThreshold = currentPlan.maxNetProfit * 0.9;
    let isActive = false;
    switch (ruleId) {
      case 'first_win':
        isActive =
          currentPlan.events.filter((e: MasaEvent) => !e.isSystemLog).length === 0;
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

  const getChartData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [{ name: 'Start', capital: config.initialCapital, days: 0 }];
    let totalEvents = 0;

    history.forEach((plan: MasaPlan, index: number) => {
      const planEvents = plan.events
        ? plan.events.filter((e: MasaEvent) => !e.isSystemLog).length
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
        ? currentPlan.events.filter((e: MasaEvent) => !e.isSystemLog).length
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

  const getWeeklyHeatmapData = () => {
    // Usiamo esattamente la stessa logica del box "Profitto Totale"
    const currentCapital = currentPlan
      ? currentPlan.currentCapital
      : config.initialCapital;

    const totalBanked = history.reduce(
      (acc: number, p: MasaPlan) => acc + (p.accumulatedAmount || 0),
      0
    );

    let absoluteStartCapital = config.initialCapital;
    if (history.length > 0) {
      absoluteStartCapital = history[0].startCapital;
    } else if (currentPlan) {
      absoluteStartCapital = currentPlan.startCapital;
    }

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
          const isActive = levelIdx === 4
            ? percentage > 0.01
            : percentage >= thresholdPercent;

          return {
            key: level,
            data: isActive ? 1 : 0,
          };
        }),
      };
    });
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
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

  // Calculate weekly target as percentage of current capital
  const getWeeklyTarget = () => {
    if (!currentPlan) {
      return (config.weeklyTargetPercentage / 100) * config.initialCapital;
    }
    return (config.weeklyTargetPercentage / 100) * currentPlan.startCapital;
  };

  // Render Piano Attivo - extracted for reusability in responsive layout
  const renderPianoAttivo = () => {
    if (!currentPlan || !progressStats) return null;

    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none" />

        {/* RESCUE MODE BANNER */}
        {progressStats.isCritical && !currentPlan.isRescued && (
          <div className="relative mb-6 -mx-6 -mt-6 bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 rounded-t-xl shadow-lg border-b border-red-500/30 animate-in slide-in-from-top-2">
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                  <AlertTriangle size={24} className="text-yellow-300" />
                </div>
                <div>
                  <div className="font-extrabold text-lg tracking-tight uppercase">
                    Soglia Critica Raggiunta
                  </div>
                  <div className="text-sm text-red-100/90 leading-tight">
                    Rischio fallimento elevato. Attiva il salvagente per ridurre la varianza.
                  </div>
                </div>
              </div>

              <div className="bg-black/20 p-3 rounded-lg border border-white/10 flex flex-col gap-2 min-w-[280px]">
                <div className="flex justify-between items-center text-xs uppercase tracking-wider font-semibold opacity-80">
                  <span>Target Attuale</span>
                  <span>€{currentPlan.targetCapital.toFixed(2)}</span>
                </div>
                {rescueProjection && (
                  <div className="flex justify-between items-center text-sm font-bold text-yellow-300">
                    <span className="flex items-center gap-1">
                      <ArrowDownRight size={14} /> Nuovo Target
                    </span>
                    <span className="text-xl">
                      €{rescueProjection.target.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="h-px bg-white/10 my-1"></div>
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase opacity-60">
                      Step:
                    </span>
                    <select
                      value={rescueEventsToAdd}
                      onChange={(e) => setRescueEventsToAdd(Number(e.target.value))}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-md px-2 py-1 text-xs font-bold outline-none cursor-pointer transition-colors"
                    >
                      {[1, 2, 3, 4, 5].map(v => (
                        <option key={v} value={v} className="bg-slate-800 text-white">+{v} Eventi</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={activateRescueMode}
                    className="bg-yellow-400 hover:bg-yellow-300 text-red-900 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-yellow-400/20 transition-all hover:scale-105"
                  >
                    <LifeBuoy size={16} /> Attiva
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPlan.isRescued && (
          <div className="absolute top-4 right-4 bg-orange-500/10 border border-orange-500/50 text-orange-400 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 animate-pulse z-20">
            <LifeBuoy size={14} /> Salvagente Attivo
          </div>
        )}

        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-3 tracking-tighter">
              PIANO ATTIVO
              {currentPlan.isRescued && (
                <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-2 py-0.5 tracking-tighter font-bold">
                  RESCUED
                </span>
              )}
            </h2>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">
              Gestione Masa attiva
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700/50 font-bold text-blue-400 flex items-center gap-2">
              <Calendar size={14} /> {currentPlan.totalEvents}E / {currentPlan.expectedWins}V
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-10">
          {[
            { label: 'Capitale', value: `€${currentPlan.currentCapital.toFixed(0)}`, icon: <PiggyBank size={18} />, color: 'text-white' },
            { label: 'Eventi', value: `${progressStats.eventsPlayed}/${currentPlan.totalEvents}`, icon: <Calendar size={18} />, color: 'text-blue-400' },
            { label: 'Vittorie', value: `${progressStats.structuralWins}/${currentPlan.expectedWins}`, icon: <Trophy size={18} />, color: 'text-green-400' },
            { label: 'Errori', value: `${progressStats.structuralLosses}/${progressStats.totalAllowedErrors}`, icon: <XCircle size={18} />, color: progressStats.isCritical ? 'text-red-500 animate-pulse' : 'text-red-400' },
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br from-slate-800 to-slate-900 border ${stat.label === 'Errori' && progressStats.isCritical ? 'border-red-500/30' : 'border-slate-700/50'} rounded-xl p-4 transition-all hover:border-slate-600 group`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-slate-900/50 ${stat.color} group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className={`text-2xl font-medium ${stat.color} tracking-tight`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* BETTING BOX */}
        <div
          className={`p-4 rounded-2xl mb-5 shadow-2xl relative overflow-hidden transition-all duration-500 group ${isSequenceActive
            ? 'bg-gradient-to-br from-indigo-700 to-slate-900 border-2 border-indigo-500/30'
            : 'bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white/5'
            }`}
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="text-xs text-white uppercase tracking-[0.2em] flex items-center gap-2 font-black">
              <RefreshCw size={14} className={isSequenceActive ? 'animate-spin-slow' : ''} />
              {isSequenceActive
                ? `Sequenza (Step ${sequence.length + 1}/2)`
                : 'Prossima Puntata'}
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-lg font-medium text-white/50">€</span>
              <span className="text-3xl font-medium tracking-tighter text-white drop-shadow-lg">
                {isSequenceActive
                  ? sequence[0].stake.toFixed(2)
                  : targetStake.toFixed(2)}
              </span>
              {isSequenceActive && (
                <span className="text-[10px] bg-black/20 text-indigo-100 px-2 py-0.5 rounded-full ml-3 font-bold tracking-tight backdrop-blur-sm">
                  Quota 50%
                </span>
              )}
            </div>
          </div>

          {/* Sequence Visualizer - Only if active */}
          {isSequenceActive && (
            <div className="relative z-10 flex gap-1.5 mt-3 pt-3 border-t border-white/10">
              {sequence.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider border ${step.isWin
                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                    : 'bg-red-500/20 border-red-500/50 text-red-300'
                    }`}
                >
                  {step.isWin ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {idx + 1}°: {step.isWin ? 'V' : 'P'}
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider border border-white/10 bg-white/5 text-white/30 animate-pulse">
                2° STEP...
              </div>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE RULES */}
        <div className="mb-6">
          <button
            onClick={() => setRulesExpanded(!rulesExpanded)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-700/50 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${rulesExpanded ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                <CheckCircle size={14} />
              </div>
              <span className="font-bold text-xs text-slate-300">
                Regole Automatiche Attive: <span className="text-white ml-1">{activeRules.length}</span>
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-500 group-hover:text-slate-300 transition-transform duration-300 ${rulesExpanded ? 'rotate-180' : ''
                }`}
            />
          </button>
          {rulesExpanded && (
            <div className="mt-2 p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {RULES.map((rule) => {
                  const status = getRuleStatus(rule.id);
                  return (
                    <div
                      key={rule.id}
                      onClick={() => toggleRule(rule.id)}
                      className={`px-3 py-2 rounded-lg text-[10px] flex items-center gap-3 cursor-pointer border transition-all ${status.enabled
                        ? 'bg-slate-800 border-slate-600 text-slate-200 hover:border-slate-500 shadow-sm'
                        : 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-40 hover:opacity-100 hover:bg-slate-900/50'
                        }`}
                    >
                      <div className={`transition-all ${status.enabled ? 'scale-110 text-green-500' : 'scale-100 text-slate-700'}`}>
                        {status.enabled ? <CheckSquare size={14} /> : <Square size={14} />}
                      </div>
                      <span className={`font-medium ${!status.enabled ? 'line-through opacity-50' : ''}`}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {!isSequenceActive ? (
            <>
              <button
                onClick={() => handleFullBet(true)}
                className="group relative overflow-hidden py-4 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-green-800 active:border-b-0"
              >
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-2"><CheckCircle size={18} /> VINTA</span>
                  <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold">100% TARGET</span>
                </div>
              </button>
              <button
                onClick={() => handlePartialStep(true)}
                className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-slate-800 border-2 border-green-500/30 hover:border-green-500/50 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-2 text-green-400"><TrendingUp size={18} /> PARZIALE</span>
                  <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">
                    €{partialBtnAmount.toFixed(2)} (50%)
                  </span>
                </div>
              </button>
              <button
                onClick={() => handleFullBet(false)}
                className="group relative overflow-hidden py-4 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-red-900 active:border-b-0"
              >
                <div className="flex flex-col items-center text-white">
                  <span className="flex items-center gap-2"><XCircle size={18} /> PERSA</span>
                  <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold uppercase">Fallimento totale</span>
                </div>
              </button>
              <button
                onClick={() => handlePartialStep(false)}
                className="group relative overflow-hidden py-4 bg-slate-900 hover:bg-slate-800 border-2 border-red-500/30 hover:border-red-500/50 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-2 text-red-500"><TrendingDown size={18} /> PARZIALE</span>
                  <span className="text-[9px] text-slate-500 tracking-[0.1em] font-bold uppercase">
                    €{partialBtnAmount.toFixed(2)} (50%)
                  </span>
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handlePartialStep(true)}
                className="col-span-1 group relative overflow-hidden py-6 bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-green-800 active:border-b-0"
              >
                <div className="flex flex-col items-center">
                  <span className="flex items-center gap-3"><Trophy size={24} /> 2° VINTA</span>
                  <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold">CHIUDI SEQUENZA</span>
                </div>
              </button>
              <button
                onClick={() => handlePartialStep(false)}
                className="col-span-1 group relative overflow-hidden py-6 bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-[1.03] active:scale-[0.98] border-b-4 border-red-900 active:border-b-0"
              >
                <div className="flex flex-col items-center text-white">
                  <span className="flex items-center gap-3"><XCircle size={24} /> 2° PERSA</span>
                  <span className="text-[9px] opacity-70 tracking-[0.1em] font-bold uppercase">PERDE ENTRAMBI</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* EVENTS LIST */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <HistoryIcon size={14} /> Registro EventI ({currentPlan.events.filter((e) => !e.isSystemLog).length})
            </h3>
          </div>
          <div className="p-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {[...currentPlan.events].reverse().map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-xl flex justify-between items-center border transition-all hover:bg-slate-800/50 ${event.isSystemLog
                  ? 'bg-orange-500/5 border-orange-500/20 text-orange-200'
                  : event.isVoid
                    ? 'bg-slate-600/5 border-slate-600/20 text-slate-400'
                    : event.isWin
                      ? 'bg-green-500/5 border-green-500/20 shadow-[inset_0_0_10px_rgba(34,197,94,0.05)]'
                      : 'bg-red-500/5 border-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]'
                  }`}
              >
                {event.isSystemLog ? (
                  <div className="w-full flex justify-between items-center px-2">
                    <span className="font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                      <LifeBuoy size={14} className="text-orange-400" /> {event.message}
                    </span>
                    <span className="text-[10px] tabular-nums opacity-40">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${event.isWin ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                        {event.id}
                      </div>
                      <div>
                        <div className="font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                          {event.isVoid
                            ? <><AlertTriangle size={12} /> NULLO</>
                            : event.isWin
                              ? <><CheckCircle size={12} className="text-green-500" /> Vinto</>
                              : <><XCircle size={12} className="text-red-500" /> Perso</>}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                          {event.isPartialSequence && (
                            <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                              Sequenza
                            </span>
                          )}
                          <span className="font-medium">Quota: {event.quota}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm text-slate-200 tracking-tight">€{event.capitalAfter.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Residuo</div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white min-h-screen">
      <div className="mb-2">
        <svg width="410" height="80" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
          <g transform="translate(10, 15)">
            <path d="M30 0 L80 0 L105 43 L80 86 L30 86 L5 43 Z" stroke="#00D4FF" stroke-width="3" fill="none" />
            <path d="M30 20 L80 66 M80 20 L30 66" stroke="#00D4FF" stroke-width="5" stroke-linecap="round">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
            </path>
          </g>

          <text x="130" y="75" fill="#FFFFFF" font-family="Arial Black, sans-serif" font-weight="900" font-size="42" letter-spacing="-1">
            ABSOLUTE MASA <tspan fill="#00D4FF">X</tspan>
          </text>
        </svg>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">
              Capitale Corrente (+ Accantonato)
            </div>
            <div className="text-3xl font-medium text-green-400 flex items-baseline gap-2">
              €{stats.totalWorth.toFixed(2)}
              <span className="text-sm text-slate-500 font-medium">
                / €
                {currentPlan
                  ? currentPlan.startCapital.toFixed(2)
                  : config.initialCapital.toFixed(2)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 uppercase tracking-tighter font-bold">
              Su Cap. Iniziale: <span className="text-slate-400 font-medium">€{stats.absoluteStartCapital.toFixed(2)}</span>
            </div>
          </div>

          <div className="w-px h-12 bg-slate-700 hidden md:block"></div>

          <div className="flex-1 md:text-right">
            <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">
              Profitto Totale (+Accantonato)
            </div>
            <div
              className={`text-3xl font-medium ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
            >
              {stats.totalProfit >= 0 ? '+' : ''}€{stats.totalProfit.toFixed(2)}
            </div>
            <div className={`text-xs mt-1 flex md:justify-end items-center font-medium ${stats.totalGrowth >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
              {stats.totalGrowth >= 0 ? '+' : ''}{stats.totalGrowth.toFixed(2)}%
            </div>
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
              <div className="text-2xl font-medium text-yellow-400">
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
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <Hash size={14} className="text-blue-400" />
                <span>{stats.totalWins + stats.totalLosses} Totali</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <Calendar size={14} className="text-slate-400" />
                <span>{stats.estimatedDays} Giorni</span>
              </div>
            </div>
          </div>
          <Coins className="absolute top-2 right-2 text-yellow-500/10 w-16 h-16 pointer-events-none" />
        </div>
      </div>

      {/* MAIN CONTENT GRID: Piano Attivo on left for large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* LEFT COLUMN: Charts and other content */}
        <div className="space-y-6">
          {/* ANALYTICS ROW: CHART & HEATMAP */}
          <div className="grid grid-cols-1 gap-6">
            {/* HISTORY CHART */}
            <div className={`bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg h-[300px] flex flex-col ${history.length === 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" /> Storico Capitale
              </h3>
              <div className="flex-1 min-h-0">
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
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(value) => `${value}g`}
                    />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
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
            </div>

            {/* WEEKLY HEATMAP */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[300px]">
              <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <Target size={16} className="text-green-400" /> Target Weekly €{getWeeklyTarget().toFixed(2)} ({config.weeklyTargetPercentage}%)
              </h3>

              <div className="flex gap-4 flex-1 min-h-0 items-center">
                {/* Y-Axis Labels */}
                <div className="flex flex-col justify-between h-[150px] text-[10px] text-slate-500 py-1">
                  <span>100%</span>
                  <span>80%</span>
                  <span>60%</span>
                  <span>40%</span>
                  <span>20%</span>
                </div>

                {/* Grid */}
                <div className="flex-1 h-[150px]">
                  <div className="grid grid-cols-12 gap-1 h-full">
                    {getWeeklyHeatmapData().map((week, i) => (
                      <div key={i} className="flex flex-col justify-between h-full group">
                        <div className="flex flex-col h-full gap-0.5">
                          {week.data.map((level, levelIdx) => (
                            <div
                              key={levelIdx}
                              className={`flex-1 rounded-sm transition-all duration-500 ${level.data === 1
                                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                                : 'bg-white/5'
                                }`}
                              title={`${week.key} - ${level.key}`}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 text-center mt-1 group-hover:text-slate-300 transition-colors">
                          S{i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* ACTION BUTTONS (CONFIG) */}
          <div className="flex gap-3 mt-6 flex-wrap">
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
          </div>
        </div>

        {/* RIGHT COLUMN: Piano Attivo (sidebar on large screens, hidden on mobile) */}
        <div className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          {renderPianoAttivo()}
        </div>
      </div>


      {/* CONFIG PANEL CON ANTEPRIMA */}
      {
        showConfig && (
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
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Target Capitale Settimanale (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.weeklyTargetPercentage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      weeklyTargetPercentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded p-2"
                />
                <div className="text-xs text-slate-400 mt-1">
                  = €{((config.weeklyTargetPercentage / 100) * config.initialCapital).toFixed(2)} sul capitale iniziale
                </div>
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
        )
      }




      {/* PIANO ATTIVO - Mobile only (hidden on large screens where it's in sidebar) */}
      <div className="block lg:hidden">
        {renderPianoAttivo()}
      </div>


      {/* HISTORY */}
      {
        history.length > 0 && (
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
                          className={`font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'
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
        )
      }

      {
        !currentPlan && !showConfig && (
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
        )
      }
    </div >
  );
};

export default MasanielloCompound;
