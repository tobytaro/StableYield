
export interface Pool {
  pool: string;
  project: string;
  chain: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyMean7d?: number;
  apyMean30d?: number;
  apyBase?: number;
  apyReward?: number;
  rewardTokens?: string[];
  underlyingTokens?: string[];
  ilRisk?: string;
  isAudit?: boolean;
}

export interface NewsItem {
  id: number;
  title: string;
  published_at: string;
  url: string;
  source: {
    title: string;
    domain: string;
  };
  kind: 'news' | 'social';
}

export interface AlphaTweet {
  id: string;
  user: string;
  handle: string;
  content: string;
  timestamp: string;
  tags: string[];
}

export enum RiskLevel {
  STABLE = 'STABLE',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
}
