export interface Signal {
  token: string;
  convictionScore: number;
  pattern: string;
  chains: string[];
  totalNetFlow: string;
  fundCount: number;
  details: string[];
  exitRisk?: string;
  buyPressure?: string;
  agentInsight?: string | null;
  holderQuality?: number;
}

export interface CoordinationDetail {
  type: string;
  detail?: string;
  token?: string;
  walletCount?: number;
  anchor?: string;
  size?: number;
  direction?: string;
  ratio?: string;
}

export interface Cluster {
  anchor: string;
  anchorLabels: string[];
  related: { address: string; label: string; score: number }[];
  size: number;
}

export interface Brief {
  id: string;
  generatedAt: string;
  alphaScore: number;
  narrative: {
    theme: string;
    confidence: number;
    details: string[];
    tokens: string[];
  };
  summary: {
    accumulation: { token: string; chains: string[]; conviction: number; flow: string }[];
    rotations: { token: string; chains: string[]; pattern: string }[];
    coordinationLevel: string;
    coordinationScore: number;
  };
  topSignals: Signal[];
  coordination: {
    clusters: Cluster[];
    coordinationScore: number;
    coordinationDetails: CoordinationDetail[];
  };
  perpOverview: {
    hotMarkets: { token: string; volume: string; oi: string; pressure: string; funding: string }[];
    smPerpPositions: Record<string, { buys: number; sells: number; value: number }>;
  } | null;
  riskAlerts: { token: string; level: string; factors: string[] }[];
  rawStats: {
    tokensScanned: number;
    chainsCovered: number;
    smWalletsDetected: number;
    clustersFound: number;
  };
}

export interface ScanStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  totalRuns: number;
}
