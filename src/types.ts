export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  wallet?: string;
  paymentWallet?: string;
  referralCode?: string;
  derivToken?: string;
}

export interface ReferralEarning {
  id: string;
  referrerId: string;
  referredName: string;
  referredEmail: string;
  level: number;
  amount: number;
  type: string;
  timestamp: string;
}

export interface License {
  id: string;
  userId: string;
  key: string;
  type: string;
  status: string;
  hwid?: string;
  expiryDate?: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount?: number;
  method?: string;
  status: string;
  hash?: string;
  txHash?: string;
  planType?: string;
  createdAt?: string;
}

export interface Trade {
  id: string;
  symbol: string;
  lot: number;
  type: 'BUY' | 'SELL';
  openPrice: number;
  sl?: number;
  tp?: number;
  time: string;
  status: 'OPEN' | 'CLOSED';
  profit?: number;
  closeTime?: string;
}

export interface Stats {
  botRunning: boolean;
  balance: number;
  equity: number;
  accountType?: 'DEMO' | 'REAL';
  currency?: string;
  activeTrades: number;
  winrate: string | number;
  pnlHistory: { time: string; balance: number }[];
  liveSignals?: {
    smc: number;
    momentum: number;
    ai: number;
  };
  activeLicense?: License | null;
  pendingPayment?: any | null;
  dailyProfit?: number;
  dailyProfitTarget?: number;
  dailyLossLimit?: number;
  dailyResetHour?: string;
  preferredSession?: string;
  timezone?: string;
  antiOvertrading?: boolean;
  systemBlocked?: boolean;
  blockedUntil?: string | null;
}

export interface Config {
  riskLevel: string;
  lotMultiplier: number;
  minScore: number;
  symbols: string[];
  strategyWeights: {
    smc: number;
    momentum: number;
    ai: number;
  };
  paymentWallet?: string;
  allowBuy?: boolean;
  allowSell?: boolean;
  maxOrders?: number;
}

export type Language = 'en' | 'pt' | 'es';
