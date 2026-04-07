import { Brief } from "./types";

// Mock data for demo / development
export const mockBrief: Brief = {
  id: "sentinel-2026-04-07T20-30-00",
  generatedAt: "2026-04-07T20:30:00.000Z",
  alphaScore: 72,
  narrative: {
    theme: "Coordinated Multi-Chain Accumulation",
    confidence: 80,
    details: [
      "3 tokens being accumulated across multiple chains",
      "Top targets: ETH, SOL, AVAX",
      "Funds active in: ETH, SOL",
    ],
    tokens: ["ETH", "SOL", "AVAX"],
  },
  summary: {
    accumulation: [
      { token: "ETH", chains: ["ethereum", "base", "arbitrum"], conviction: 85, flow: "$12.5M" },
      { token: "SOL", chains: ["solana"], conviction: 72, flow: "$8.2M" },
      { token: "AVAX", chains: ["avalanche", "ethereum"], conviction: 58, flow: "$3.1M" },
    ],
    rotations: [
      { token: "BNB", chains: ["bnb", "ethereum"], pattern: "Rotation: buying on ethereum, selling on bnb" },
    ],
    coordinationLevel: "HIGH",
    coordinationScore: 65,
  },
  topSignals: [
    {
      token: "ETH",
      convictionScore: 85,
      pattern: "multi_chain_accumulation",
      chains: ["ethereum", "base", "arbitrum"],
      totalNetFlow: "$12.5M",
      fundCount: 3,
      details: ["SM accumulating on ethereum, base, arbitrum", "Funds active on ethereum, base"],
      exitRisk: "LOW",
      buyPressure: "0.82",
      agentInsight:
        "Smart money appears to be positioning for a major ETH ecosystem expansion. Coordinated buying across L2s suggests anticipation of increased DeFi activity. Fund involvement across 3 chains indicates high institutional conviction.",
      holderQuality: 12,
    },
    {
      token: "SOL",
      convictionScore: 72,
      pattern: "chain_specific_play",
      chains: ["solana"],
      totalNetFlow: "$8.2M",
      fundCount: 1,
      details: ["Strong single-chain signal on solana: $8.2M"],
      exitRisk: "LOW",
      buyPressure: "0.75",
      agentInsight:
        "Concentrated smart money accumulation on Solana with 4 Smart Trader labels active. Perp market shows bullish positioning with positive funding. Meme ecosystem rotation may be starting.",
      holderQuality: 8,
    },
    {
      token: "AVAX",
      convictionScore: 58,
      pattern: "multi_chain_accumulation",
      chains: ["avalanche", "ethereum"],
      totalNetFlow: "$3.1M",
      fundCount: 2,
      details: ["SM accumulating on avalanche, ethereum"],
      exitRisk: "MEDIUM",
      buyPressure: "0.68",
      agentInsight: null,
      holderQuality: 5,
    },
    {
      token: "RENDER",
      convictionScore: 45,
      pattern: "chain_specific_play",
      chains: ["ethereum"],
      totalNetFlow: "$2.4M",
      fundCount: 0,
      details: ["Strong single-chain signal on ethereum: $2.4M"],
      exitRisk: "LOW",
      buyPressure: "0.71",
      holderQuality: 6,
    },
    {
      token: "ONDO",
      convictionScore: 38,
      pattern: "multi_chain_accumulation",
      chains: ["ethereum", "base"],
      totalNetFlow: "$1.8M",
      fundCount: 1,
      details: ["SM accumulating on ethereum, base"],
      exitRisk: "MEDIUM",
      buyPressure: "0.62",
      holderQuality: 4,
    },
  ],
  coordination: {
    clusters: [
      {
        anchor: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        anchorLabels: ["Smart Trader", "Defi Veteran"],
        related: [
          { address: "0xabc1...def1", label: "Whale", score: 0.92 },
          { address: "0xabc2...def2", label: "Smart Trader", score: 0.88 },
          { address: "0xabc3...def3", label: "Fund", score: 0.85 },
          { address: "0xabc4...def4", label: "Smart Trader", score: 0.79 },
        ],
        size: 5,
      },
      {
        anchor: "DRpbCBMxVnDK7maPMoGQfFiB4P4cByAHpLMkP1g8",
        anchorLabels: ["Smart Trader"],
        related: [
          { address: "Sol1...addr1", label: "Whale", score: 0.91 },
          { address: "Sol2...addr2", label: "Smart Trader", score: 0.87 },
          { address: "Sol3...addr3", label: "Unknown", score: 0.72 },
        ],
        size: 4,
      },
    ],
    coordinationScore: 65,
    coordinationDetails: [
      { type: "coordinated_trading", token: "ETH", walletCount: 5, detail: "5 SM wallets trading ETH" },
      { type: "wallet_cluster", anchor: "0x7a25...", size: 5, detail: "Cluster of 5 related wallets around 0x7a25..." },
      { type: "directional_bias", direction: "bullish", ratio: "0.78", detail: undefined },
    ],
  },
  perpOverview: {
    hotMarkets: [
      { token: "BTC", volume: "$2.1B", oi: "$8.5B", pressure: "BULLISH", funding: "0.0100" },
      { token: "ETH", volume: "$1.4B", oi: "$5.2B", pressure: "BULLISH", funding: "0.0085" },
      { token: "SOL", volume: "$890M", oi: "$3.1B", pressure: "BULLISH", funding: "0.0120" },
      { token: "DOGE", volume: "$420M", oi: "$1.8B", pressure: "BEARISH", funding: "-0.0030" },
      { token: "WIF", volume: "$180M", oi: "$620M", pressure: "BULLISH", funding: "0.0250" },
    ],
    smPerpPositions: {
      ETH: { buys: 12, sells: 3, value: 5400000 },
      SOL: { buys: 8, sells: 2, value: 2800000 },
      BTC: { buys: 6, sells: 5, value: 1200000 },
      WIF: { buys: 4, sells: 1, value: 800000 },
      AVAX: { buys: 3, sells: 1, value: 600000 },
    },
  },
  riskAlerts: [
    { token: "AVAX", level: "MEDIUM", factors: ["Slight SM outflow: -$150K"] },
    { token: "ONDO", level: "MEDIUM", factors: ["Slight SM outflow: -$80K"] },
  ],
  rawStats: {
    tokensScanned: 156,
    chainsCovered: 7,
    smWalletsDetected: 23,
    clustersFound: 2,
  },
};
