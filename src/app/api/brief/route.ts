import { NextResponse } from "next/server";
import { Brief, Signal } from "@/lib/types";
import { mockBrief } from "@/lib/mock";
import {
  getSmNetflows,
  getSmHoldings,
  getSmPerpTrades,
  getSmDexTrades,
} from "@/lib/nansen";

const CHAINS = ["ethereum", "solana", "base", "arbitrum"];

function formatUsd(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function detectPattern(chains: string[], netFlow: number): string {
  if (chains.length > 1 && netFlow > 0) return "multi_chain_accumulation";
  if (chains.length > 1 && netFlow < 0) return "capital_rotation";
  if (chains.length === 1) return "chain_specific_play";
  return "accumulation";
}

function calcBuyPressure(buys: number, sells: number): string {
  const total = buys + sells;
  if (total === 0) return "0.50";
  return (buys / total).toFixed(2);
}

function scoreSignal(
  netFlowUsd: number,
  chains: string[],
  smCount: number,
  fundCount: number
): number {
  let score = 0;
  // Net flow strength (0-35)
  score += Math.min(Math.abs(netFlowUsd) / 50000, 35);
  // Cross-chain presence (0-20)
  score += Math.min(chains.length * 7, 20);
  // SM wallet count (0-25)
  score += Math.min(smCount * 3, 25);
  // Fund involvement (0-20)
  score += Math.min(fundCount * 10, 20);
  return Math.round(Math.min(score, 100));
}

export async function GET() {
  const apiKey = process.env.NANSEN_API_KEY;

  // No API key → return mock data
  if (!apiKey) {
    return NextResponse.json({
      ...mockBrief,
      _demo: true,
      _message: "Add NANSEN_API_KEY env var to see live data",
    });
  }

  try {
    // Fetch data in parallel
    const [netflowData, holdingsData, perpData, dexData] = await Promise.all([
      getSmNetflows(CHAINS).catch(() => null),
      getSmHoldings(["ethereum"]).catch(() => null),
      getSmPerpTrades().catch(() => null),
      getSmDexTrades(CHAINS).catch(() => null),
    ]);

    // ── Process netflow signals ──────────────────────────────
    const tokenMap = new Map<
      string,
      {
        token: string;
        totalNetFlowUsd: number;
        chains: Set<string>;
        smCount: number;
        fundCount: number;
        buys: number;
        sells: number;
        details: string[];
      }
    >();

    // Aggregate from netflow data
    const netflowItems = Array.isArray(netflowData) ? netflowData : netflowData?.items || [];
    for (const item of netflowItems) {
      const symbol = item.token_symbol || item.token || item.symbol;
      if (!symbol) continue;
      const chain = (item.chain || "ethereum").toLowerCase();
      const flow = item.net_flow_24h_usd || item.net_flow_usd || 0;
      const smCount = item.smart_money_count || item.sm_count || 1;
      const fundCount = item.fund_count || 0;

      const existing = tokenMap.get(symbol);
      if (existing) {
        existing.totalNetFlowUsd += flow;
        existing.chains.add(chain);
        existing.smCount += smCount;
        existing.fundCount += fundCount;
      } else {
        tokenMap.set(symbol, {
          token: symbol,
          totalNetFlowUsd: flow,
          chains: new Set([chain]),
          smCount,
          fundCount,
          buys: 0,
          sells: 0,
          details: [],
        });
      }
    }

    // Aggregate DEX trades for buy/sell counts
    const dexItems = Array.isArray(dexData) ? dexData : dexData?.items || [];
    for (const trade of dexItems) {
      const symbol = trade.token_symbol || trade.token || trade.symbol;
      if (!symbol) continue;
      const entry = tokenMap.get(symbol);
      if (entry) {
        if (trade.side === "buy" || trade.type === "buy") entry.buys++;
        else entry.sells++;
      }
    }

    // Build top signals
    const signals: Signal[] = [...tokenMap.values()]
      .sort((a, b) => Math.abs(b.totalNetFlowUsd) - Math.abs(a.totalNetFlowUsd))
      .slice(0, 10)
      .map((s) => {
        const chains = [...s.chains];
        const pattern = detectPattern(chains, s.totalNetFlowUsd);
        const conviction = scoreSignal(s.totalNetFlowUsd, chains, s.smCount, s.fundCount);
        const buyPressure = calcBuyPressure(s.buys, s.sells);
        const exitRisk =
          s.totalNetFlowUsd < -50000 ? "HIGH" : s.totalNetFlowUsd < 0 ? "MEDIUM" : "LOW";

        return {
          token: s.token,
          convictionScore: conviction,
          pattern,
          chains,
          totalNetFlow: formatUsd(s.totalNetFlowUsd),
          fundCount: s.fundCount,
          details:
            chains.length > 1
              ? [`SM accumulating on ${chains.join(", ")}`]
              : [`Strong single-chain signal on ${chains[0]}: ${formatUsd(s.totalNetFlowUsd)}`],
          exitRisk,
          buyPressure,
          agentInsight: null, // Would need agent call per token (expensive)
        };
      });

    // ── Process perp data ────────────────────────────────────
    const perpItems = Array.isArray(perpData) ? perpData : perpData?.items || [];
    const smPerpPositions: Record<string, { buys: number; sells: number; value: number }> = {};
    const perpTokens = new Set<string>();

    for (const trade of perpItems) {
      const token = trade.token_symbol || trade.token || trade.symbol;
      if (!token) continue;
      perpTokens.add(token);
      if (!smPerpPositions[token]) smPerpPositions[token] = { buys: 0, sells: 0, value: 0 };
      const side = (trade.side || trade.direction || "").toLowerCase();
      const val = trade.value_usd || trade.amount_usd || 0;
      if (side === "buy" || side === "long") {
        smPerpPositions[token].buys++;
        smPerpPositions[token].value += val;
      } else {
        smPerpPositions[token].sells++;
        smPerpPositions[token].value += val;
      }
    }

    // ── Build narrative ──────────────────────────────────────
    const accumTokens = signals.filter((s) => s.pattern === "multi_chain_accumulation");
    const rotTokens = signals.filter((s) => s.pattern === "capital_rotation");
    const narrative =
      accumTokens.length >= 2
        ? "Coordinated Multi-Chain Accumulation"
        : rotTokens.length >= 2
        ? "Capital Rotation in Progress"
        : signals.length > 0
        ? "Selective Smart Money Positioning"
        : "No Clear Narrative";

    const narrativeConfidence = Math.min(
      50 + accumTokens.length * 10 + (signals[0]?.convictionScore || 0) * 0.2,
      95
    );

    // ── Build risk alerts ────────────────────────────────────
    const riskAlerts = signals
      .filter((s) => s.exitRisk !== "LOW")
      .map((s) => ({
        token: s.token,
        level: s.exitRisk || "MEDIUM",
        factors: [`Net SM outflow: ${s.totalNetFlow}`],
      }));

    // ── Compute alpha score ──────────────────────────────────
    const alphaScore = Math.round(
      Math.min(
        30 +
          signals.length * 3 +
          (accumTokens.length > 0 ? 15 : 0) +
          Math.max(...signals.map((s) => s.convictionScore), 0) * 0.2,
        100
      )
    );

    // ── Build the brief ──────────────────────────────────────
    const brief: Brief = {
      id: `sentinel-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`,
      generatedAt: new Date().toISOString(),
      alphaScore,
      narrative: {
        theme: narrative,
        confidence: Math.round(narrativeConfidence),
        details: [
          `${signals.length} tokens showing significant SM activity`,
          `Top targets: ${signals.slice(0, 3).map((s) => s.token).join(", ")}`,
          `Funds active in: ${signals.filter((s) => s.fundCount > 0).map((s) => s.token).join(", ") || "none detected"}`,
        ],
        tokens: signals.slice(0, 5).map((s) => s.token),
      },
      summary: {
        accumulation: accumTokens.map((s) => ({
          token: s.token,
          chains: s.chains,
          conviction: s.convictionScore,
          flow: s.totalNetFlow,
        })),
        rotations: rotTokens.map((s) => ({
          token: s.token,
          chains: s.chains,
          pattern: s.pattern,
        })),
        coordinationLevel: signals.length > 3 ? "HIGH" : signals.length > 1 ? "MEDIUM" : "LOW",
        coordinationScore: Math.min(signals.length * 15, 100),
      },
      topSignals: signals,
      coordination: {
        clusters: [],
        coordinationScore: Math.min(signals.length * 15, 100),
        coordinationDetails: signals
          .filter((s) => s.fundCount > 0 || s.convictionScore > 50)
          .map((s) => ({
            type: "coordinated_trading",
            token: s.token,
            walletCount: s.fundCount + 1,
          })),
      },
      perpOverview: perpTokens.size > 0 ? { hotMarkets: [], smPerpPositions } : null,
      riskAlerts,
      rawStats: {
        tokensScanned: tokenMap.size,
        chainsCovered: CHAINS.length,
        smWalletsDetected: [...tokenMap.values()].reduce((a, t) => a + t.smCount, 0),
        clustersFound: 0,
      },
    };

    return NextResponse.json(brief);
  } catch (err: unknown) {
    console.error("[SENTINEL API ERROR]", err);
    // Fallback to mock on error
    return NextResponse.json({
      ...mockBrief,
      _demo: true,
      _error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
