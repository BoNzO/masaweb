export interface Config {
  initialCapital: number;
  quota: number;
  totalEvents: number;
  expectedWins: number;
  accumulationPercent: number;
  weeklyTargetPercentage: number;
  milestoneBankPercentage: number;
  stopLossPercentage: number;
  maxConsecutiveLosses?: number;
  trailingProfitActivation?: number; // % of max profit to activate trailing
  trailingProfitLock?: number; // % of profit to lock when trailing activated
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
  milestonesBanked?: number;
  profitMilestoneReached?: number;
  maxConsecutiveLosses?: number;
  currentConsecutiveLosses?: number;
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
