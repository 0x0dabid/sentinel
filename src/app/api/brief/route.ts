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

function scoreSignal(
  netFlowUsd: number,
  chains: string[],
  traderCount: number
): number {
  let score = 0;
  score += Math.min(Math.abs(netFlowUsd) / 50000, 35);
  score += Math.min(chains.length * 7, 20);
  score += Math.min(traderCount * 2, 25);
  score += netFlowUsd > 0 ? 20 : 0;
  return Math.round(Math.min(score, 100));
}

export async function GET() {
  const apiKey = process.env.NANSEN_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ...mockBrief,
      _demo: true,
      _message: "Add NANSEN_API_KEY env var to see live data",
    });
  }

  const errors: string[] = [];

  try {
    // Fetch all data in parallel — each catches its own errors
    const [netflowItems, holdingsItems, perpItems, dexItems] = await Promise.all([
      getSmNetflows(CHAINS).catch((e) => { errors.push(`netflow: ${e.message}`); return []; }),
      getSmHoldings(["ethereum"]).catch((e) => { errors.push(`holdings: ${e.message}`); return []; }),
      getSmPerpTrades().catch((e) => { errors.push(`perp: ${e.message}`); return []; }),
      getSmDexTrades(CHAINS).catch((e) => { errors.push(`dex: ${e.message}`); return []; }),
    ]);

    // ── Process netflow data ──────────────────────────────────
    // Response shape: { token_symbol, net_flow_24h_usd, chain, trader_count, ... }
    const tokenMap = new Map<string, {
      token: string;
      totalNetFlowUsd: number;
      chains: Set<string>;
      traderCount: number;
      buys: number;
      sells: number;
    }>();

    for (const item of netflowItems as Record<string, unknown>[]) {
      const symbol = (item.token_symbol as string) || (item.token as string);
      if (!symbol) continue;
      const chain = String(item.chain || "ethereum").toLowerCase();
      const flow = Number(item.net_flow_24h_usd || 0);
      const traders = Number(item.trader_count || 1);

      const existing = tokenMap.get(symbol);
      if (existing) {
        existing.totalNetFlowUsd += flow;
        existing.chains.add(chain);
        existing.traderCount += traders;
      } else {
        tokenMap.set(symbol, {
          token: symbol,
          totalNetFlowUsd: flow,
          chains: new Set([chain]),
          traderCount: traders,
          buys: 0,
          sells: 0,
        });
      }
    }

    // Aggregate perp trade buy/sell per token
    // Response shape: { token_symbol, side, action, value_usd, ... }
    const smPerpPositions: Record<string, { buys: number; sells: number; value: number }> = {};
    const perpTokens = new Set<string>();

    for (const trade of perpItems as Record<string, unknown>[]) {
      const token = (trade.token_symbol as string) || (trade.token as string);
      if (!token) continue;
      perpTokens.add(token);
      if (!smPerpPositions[token]) smPerpPositions[token] = { buys: 0, sells: 0, value: 0 };
      const action = String(trade.action || "").toLowerCase();
      const side = String(trade.side || "").toLowerCase();
      const val = Number(trade.value_usd || 0);
      if (action.includes("buy") || side.includes("long") || action.includes("add")) {
        smPerpPositions[token].buys++;
        smPerpPositions[token].value += val;
      } else {
        smPerpPositions[token].sells++;
        smPerpPositions[token].value += val;
      }
    }

    // Aggregate DEX trades
    for (const trade of dexItems as Record<string, unknown>[]) {
      const symbol = (trade.token_symbol as string) || (trade.token as string) || (trade.bought_token_symbol as string);
      if (!symbol) continue;
      const entry = tokenMap.get(symbol);
      if (entry) {
        const side = String(trade.side || "").toLowerCase();
        if (side === "buy") entry.buys++;
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
        const conviction = scoreSignal(s.totalNetFlowUsd, chains, s.traderCount);
        const totalTrades = s.buys + s.sells;
        const buyPressure = totalTrades > 0 ? (s.buys / totalTrades).toFixed(2) : "0.50";
        const exitRisk =
          s.totalNetFlowUsd < -50000 ? "HIGH" : s.totalNetFlowUsd < 0 ? "MEDIUM" : "LOW";

        return {
          token: s.token,
          convictionScore: conviction,
          pattern,
          chains,
          totalNetFlow: formatUsd(s.totalNetFlowUsd),
          fundCount: 0,
          details:
            chains.length > 1
              ? [`SM accumulating on ${chains.join(", ")}`, `Net flow: ${formatUsd(s.totalNetFlowUsd)}`, `${s.traderCount} SM traders involved`]
              : [`Strong single-chain signal on ${chains[0]}: ${formatUsd(s.totalNetFlowUsd)}`, `${s.traderCount} SM traders`],
          exitRisk,
          buyPressure,
          agentInsight: null,
        };
      });

    // ── Build narrative ───────────────────────────────────────
    const accumTokens = signals.filter((s) => s.totalNetFlow.startsWith("-") === false && s.convictionScore > 30);
    const rotTokens = signals.filter((s) => s.pattern === "capital_rotation");

    const narrative =
      accumTokens.length >= 3
        ? "Coordinated Multi-Chain Accumulation"
        : accumTokens.length >= 2
        ? "Targeted Smart Money Positioning"
        : rotTokens.length >= 2
        ? "Capital Rotation in Progress"
        : signals.length > 0
        ? "Selective Smart Money Activity"
        : "No Clear Narrative";

    const narrativeConfidence = Math.min(
      40 + accumTokens.length * 12 + (signals[0]?.convictionScore || 0) * 0.3,
      95
    );

    const alphaScore = Math.round(
      Math.min(
        30 + signals.length * 4 + (accumTokens.length > 0 ? 15 : 0) + Math.max(...signals.map((s) => s.convictionScore), 0) * 0.25,
        100
      )
    );

    const brief: Brief = {
      id: `sentinel-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`,
      generatedAt: new Date().toISOString(),
      alphaScore,
      narrative: {
        theme: narrative,
        confidence: Math.round(narrativeConfidence),
        details: [
          `${tokenMap.size} tokens scanned, ${signals.length} significant signals`,
          `Top accumulation: ${signals.filter(s => s.totalNetFlow.startsWith("-") === false).slice(0, 3).map(s => `${s.token} (${s.totalNetFlow})`).join(", ") || "none"}`,
          `Perp activity: ${perpTokens.size} tokens with SM perp positions`,
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
          .filter((s) => s.convictionScore > 40)
          .map((s) => ({
            type: "coordinated_trading",
            token: s.token,
            walletCount: Math.max(1, Math.round(Number(s.buyPressure) * 10)),
          })),
      },
      perpOverview: perpTokens.size > 0 ? { hotMarkets: [], smPerpPositions } : null,
      riskAlerts: signals
        .filter((s) => s.exitRisk === "HIGH" || s.exitRisk === "MEDIUM")
        .map((s) => ({
          token: s.token,
          level: s.exitRisk || "MEDIUM",
          factors: [`Net flow: ${s.totalNetFlow}`],
        })),
      rawStats: {
        tokensScanned: tokenMap.size,
        chainsCovered: CHAINS.length,
        smWalletsDetected: [...tokenMap.values()].reduce((a, t) => a + t.traderCount, 0),
        clustersFound: 0,
      },
    };

    // Attach debug info
    const response = { ...brief } as Record<string, unknown>;
    response._live = true;
    response._endpointsHit = 4;
    if (errors.length > 0) response._errors = errors;

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[SENTINEL API ERROR]", err);
    return NextResponse.json({
      ...mockBrief,
      _demo: true,
      _error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
