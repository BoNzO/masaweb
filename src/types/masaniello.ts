export interface Config {
  initialCapital: number;
  quota: number;
  totalEvents: number;
  expectedWins: number;
  accumulationPercent: number;
  weeklyTargetPercentage: number;
  milestoneBankPercentage: number;
  maxConsecutiveLosses?: number;
}

export interface EventDetail {
  stake: number;
  isWin: boolean;
  netResult: number;
}

export interface MasaEvent {
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
  snapshot?: EventSnapshot;
}

export interface EventSnapshot {
  config: Config;
  activeRules: string[];
  isRescued: boolean;
  currentConsecutiveLosses: number;
  maxConsecutiveLosses?: number;

  suggestedStake?: number;
  targetCapital?: number;
}

export interface MasaPlan {
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
  currentWeeklyTarget?: number;
  startWeeklyBaseline?: number;
  milestonesBanked?: number;
  profitMilestoneReached?: number;
  maxConsecutiveLosses?: number;
  currentConsecutiveLosses?: number;
  // Tree Properties
  parentId?: number | null;
  childrenIds?: number[];
  treeStatus?: 'active' | 'completed' | 'bankrupt' | 'merged';
  tags?: string[];
}

export interface ChartDataPoint {
  name: string;
  capital: number;
  days: number;
  cycle?: number;
}

export interface Rule {
  id: string;
  label: string;
}

// Multi-Masaniello System Types

export interface MasanielloInstance {
  id: string; // "masa_1", "masa_2", "masa_3"
  number: number; // 1, 2, 3
  name: string; // "Masaniello #1", "Masaniello #2", "Masaniello #3"
  status: 'active' | 'archived';
  config: Config;
  activeRules: string[];
  currentPlan: MasaPlan | null;
  history: MasaPlan[];
  absoluteStartCapital: number;
  createdAt: string;
  archivedAt?: string;
}

export interface CapitalPool {
  totalAvailable: number;
  allocations: {
    [masaId: string]: number; // Amount allocated to each Masaniello
  };
  history: CapitalPoolTransaction[];
}

export interface CapitalPoolTransaction {
  id: string;
  timestamp: string;
  type: 'allocation' | 'release' | 'transfer';
  amount: number;
  fromMasaId?: string;
  toMasaId?: string;
  description: string;
}

export interface MultiMasaState {
  instances: {
    [id: string]: MasanielloInstance;
  };
  capitalPool: CapitalPool;
  activeInstanceIds: string[]; // Max 3
  archivedInstanceIds: string[];
  currentViewId: string | null; // Currently selected tab
}

export interface AggregatedStats {
  totalWorth: number; // Sum of all active Masaniello capitals + banked
  totalBanked: number; // Sum of all banked amounts
  totalProfit: number;
  totalGrowth: number;
  totalWins: number;
  totalLosses: number;
  combinedChartData: ChartDataPoint[];
}
