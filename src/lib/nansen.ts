// Nansen API client — exact formats from docs.nansen.ai
// Base URL: https://api.nansen.ai
// Auth: apiKey header

const BASE_URL = "https://api.nansen.ai";

function getApiKey(): string {
  const key = process.env.NANSEN_API_KEY;
  if (!key) throw new Error("NANSEN_API_KEY not set");
  return key;
}

interface NansenResponse {
  data?: unknown[];
  pagination?: { page: number; per_page: number; is_last_page: boolean };
}

async function nansenFetch(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiKey: getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[NANSEN ${res.status}] ${endpoint}: ${text.slice(0, 500)}`);
    throw new Error(`Nansen API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json: NansenResponse = await res.json();
  return json.data || [];
}

// ── Smart Money Netflows ──────────────────────────────────────
// POST /api/v1/smart-money/netflow
export async function getSmNetflows(chains: string[] = ["ethereum", "solana", "base", "arbitrum"]) {
  return nansenFetch("/api/v1/smart-money/netflow", {
    chains,
    filters: {
      include_smart_money_labels: ["Fund", "Smart Trader"],
      include_native_tokens: false,
      include_stablecoins: false,
    },
    premium_labels: true,
    pagination: { page: 1, per_page: 20 },
    order_by: [{ direction: "DESC", field: "net_flow_24h_usd" }],
  });
}

// ── Smart Money Holdings ──────────────────────────────────────
// POST /api/v1/smart-money/holdings
export async function getSmHoldings(chains: string[] = ["ethereum"]) {
  return nansenFetch("/api/v1/smart-money/holdings", {
    chains,
    filters: {
      include_smart_money_labels: ["Fund"],
    },
    premium_labels: true,
    pagination: { page: 1, per_page: 20 },
    order_by: [{ direction: "DESC", field: "value_usd" }],
  });
}

// ── Smart Money Perp Trades ───────────────────────────────────
// POST /api/v1/smart-money/perp-trades
export async function getSmPerpTrades() {
  return nansenFetch("/api/v1/smart-money/perp-trades", {
    filters: {
      value_usd: { min: 1000 },
    },
    premium_labels: true,
    only_new_positions: true,
    pagination: { page: 1, per_page: 50 },
    order_by: [{ field: "block_timestamp", direction: "DESC" }],
  });
}

// ── Smart Money DEX Trades ────────────────────────────────────
// POST /api/v1/smart-money/dex-trades
export async function getSmDexTrades(chains: string[] = ["ethereum", "solana", "base"]) {
  return nansenFetch("/api/v1/smart-money/dex-trades", {
    chains,
    filters: {
      include_smart_money_labels: ["Fund", "Smart Trader"],
    },
    premium_labels: true,
    pagination: { page: 1, per_page: 50 },
    order_by: [{ field: "block_timestamp", direction: "DESC" }],
  });
}

// ── Token: Holders ────────────────────────────────────────────
// POST /api/v1/token/holders
export async function getTokenHolders(token: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/token/holders", {
    token,
    chain,
    filters: { include_smart_money_labels: ["Fund", "Smart Trader"] },
    premium_labels: true,
    pagination: { page: 1, per_page: 20 },
  });
}

// ── Token: Who Bought/Sold ────────────────────────────────────
// POST /api/v1/token/who-bought-sold
export async function getTokenWhoBoughtSold(token: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/token/who-bought-sold", {
    token,
    chain,
    pagination: { page: 1, per_page: 20 },
  });
}

// ── Token: Flow Intelligence ──────────────────────────────────
// POST /api/v1/token/flow-intelligence
export async function getTokenFlowIntelligence(token: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/token/flow-intelligence", {
    token,
    chain,
  });
}

// ── Profiler: Labels ──────────────────────────────────────────
// POST /api/v1/profiler/labels
export async function getProfilerLabels(address: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/profiler/labels", {
    address,
    chain,
  });
}

// ── Profiler: Related Wallets ─────────────────────────────────
// POST /api/v1/profiler/related-wallets
export async function getProfilerRelatedWallets(address: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/profiler/related-wallets", {
    address,
    chain,
    pagination: { page: 1, per_page: 10 },
  });
}

// ── Agent: Expert Analysis ────────────────────────────────────
// POST /api/v1/agent
export async function getAgentExpert(prompt: string) {
  return nansenFetch("/api/v1/agent", {
    prompt,
    mode: "expert",
  });
}
