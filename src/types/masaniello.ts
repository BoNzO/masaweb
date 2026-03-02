export type PlanRole = 'standard' | 'master' | 'slave' | 'differential' | 'twin';
export type PlanHierarchy = 'STANDALONE' | 'FATHER' | 'SON';

export interface FeedForwardConfig {
  slavePlanId?: string;
  percentage: number;
  totalFed: number;
}

export interface ElasticConfig {
  enabled: boolean;
  triggerOnLosses: number;
  addEvents: number;
  addWins: number;
  maxStretches: number;
}

export interface FeedSource {
  masterPlanId?: string;
  virtualBuffer: number;
  isPaused: boolean;
}

export interface Config {
  initialCapital: number;
  quota: number;
  totalEvents: number;
  expectedWins: number;
  accumulationPercent: number;
  weeklyTargetPercentage: number;
  milestoneBankPercentage: number;
  maxConsecutiveLosses?: number;
  checklistTemplate?: string[];
  role?: PlanRole;
  feedForwardConfig?: FeedForwardConfig;
  feedSource?: FeedSource;
  elasticConfig?: ElasticConfig;
  hierarchyType?: PlanHierarchy;
  tradingCommission?: number;
  fatherPlanId?: string | null;
  fatherEventId?: string | null;
  fatherStake?: number;
  fatherQuota?: number;
  twinConfig?: {
    capitalLong: number;
    capitalShort: number;
    quotaLong?: number;
    quotaShort?: number;
    totalEventsLong?: number;
    totalEventsShort?: number;
    expectedWinsLong?: number;
    expectedWinsShort?: number;
  };
  hedgeMultiplier?: number;
  hedgeQuota?: number;
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
  pair?: string;
  checklistResults?: Record<string, boolean>;
  nyTimestamp?: string;
  snapshot?: EventSnapshot;
  feedAmount?: number; // Amount fed to slave or taken from buffer
  linkedSonPlanId?: string | null;
  isHierarchySummary?: boolean;
  isHedge?: boolean;
  note?: string;
}

export interface EventSnapshot {
  config: Config;
  activeRules: string[];
  isRescued: boolean;
  currentConsecutiveLosses: number;
  maxConsecutiveLosses?: number;
  elasticStretchesUsed?: number;
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
  notificationDismissed?: boolean;
  lastUsedPair?: string;
  weeklyTargetsReached?: number;
  role?: PlanRole;
  feedForwardConfig?: FeedForwardConfig;
  feedSource?: FeedSource;
  fedAmount?: number;
  preRescueConfig?: Partial<Config>; // Stores original config before Rescue Mode modifications
  elasticStretchesUsed: number;
  elasticConfig?: ElasticConfig;
  hierarchyType: PlanHierarchy;
  tradingCommission?: number;
  fatherPlanId?: string | null;
  fatherEventId?: string | null;
  fatherStake?: number;
  fatherQuota?: number;
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
  globalWeeklyTargetsReached?: number; // Total targets reached across all plans of this instance
  persistentWeeklyTarget?: number;    // Current target to beat
  persistentWeeklyBaseline?: number;  // Capital baseline for current target
  createdAt: string;
  archivedAt?: string;
  type?: 'standard' | 'differential' | 'twin';
  differentialState?: {
    planA: MasaPlan;
    planB: MasaPlan;
    status: 'active' | 'success_a' | 'success_b' | 'failed';
    realCapital?: number;
    history?: Array<{
      id: string;
      stakeA: number;
      stakeB: number;
      stakeDiff: number;
      direction: 'LONG' | 'SHORT' | 'NEUTRAL';
      outcome: 'WIN_A' | 'WIN_B' | 'LOSS_BOTH';
      netProfit: number;
      realCapitalAfter: number;
      timestamp: string;
      note?: string;
    }>;
  };
  twinState?: {
    planLong: MasaPlan;
    planShort: MasaPlan;
    historyLong?: MasaPlan[];
    historyShort?: MasaPlan[];
    activeSide: 'LONG' | 'SHORT' | null;
    hedgeMultiplier?: number; // Default 0.2 (20% of main stake)
    snapshots?: Array<{
      timestamp: string;
      side: 'LONG' | 'SHORT';
      capitalLocked: number;
    }>;
  };
  actionsQueue?: { type: string; payload: any }[];
  sonsCompleted?: number;
  sonsFailed?: number;
  lastSonConfig?: Config;
  missionResultQueued?: 'win' | 'loss' | null;
}

export interface CapitalPool {
  totalAvailable: number;
  totalDeposited: number;
  allocations: {
    [masaId: string]: number; // Amount allocated to each Masaniello
  };
  history: CapitalPoolTransaction[];
  lifetimeWins?: number;
  lifetimeLosses?: number;
  resetWinsOffset?: number;
  resetLossesOffset?: number;
  resetTargetsOffset?: number;
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

export interface StrategyTemplate {
  id: string;
  name: string;
  config: Partial<Config>;
  activeRules: string[];
  type: 'standard' | 'differential' | 'twin';
  isDefault?: boolean;
}

export interface MultiMasaState {
  instances: {
    [id: string]: MasanielloInstance;
  };
  capitalPool: CapitalPool;
  activeInstanceIds: string[]; // Max 3
  archivedInstanceIds: string[];
  currentViewId: string | null; // Currently selected tab
  savedLogs?: Array<{
    id: string;
    instanceName: string;
    instanceType: 'standard' | 'differential' | 'twin';
    timestamp: string;
    plan: MasaPlan;
    // For differential/twin, we might want to store more, but MasaPlan is the core
  }>;
}

export interface AggregatedStats {
  totalInitialCapital: number; // Sum of all absoluteStartCapital of active Masaniellos
  totalWorth: number; // Sum of all active Masaniello capitals + banked
  totalBanked: number; // Sum of all banked amounts
  totalProfit: number;
  totalGrowth: number;
  totalWins: number;
  totalLosses: number;
  totalWeeklyTargetsReached: number;
  totalMasterCapital: number;
  totalSlaveCapital: number;
  totalDays: number;
  combinedChartData: ChartDataPoint[];
}
