// Nansen API client for server-side use
// Base URL: https://api.nansen.ai
// Auth: apikey header

const BASE_URL = "https://api.nansen.ai";

function getApiKey(): string {
  const key = process.env.NANSEN_API_KEY;
  if (!key) throw new Error("NANSEN_API_KEY not set");
  return key;
}

async function nansenFetch(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[NANSEN ${res.status}] ${endpoint}: ${text.slice(0, 200)}`);
    return null;
  }

  const data = await res.json();
  return data.data || data;
}

// ── Smart Money Netflows ──────────────────────────────────────
export async function getSmNetflows(chains: string[] = ["ethereum", "solana", "base", "arbitrum"]) {
  return nansenFetch("/api/v1/smart-money/netflow", {
    chains,
    sort: [{ field: "net_flow_24h_usd", direction: "DESC" }],
    limit: 20,
  });
}

// ── Smart Money Holdings ──────────────────────────────────────
export async function getSmHoldings(chains: string[] = ["ethereum"]) {
  return nansenFetch("/api/v1/smart-money/holdings", {
    chains,
    include_smart_money_labels: ["Fund"],
    sort: [{ field: "value_usd", direction: "DESC" }],
    limit: 20,
  });
}

// ── Smart Money Perp Trades ───────────────────────────────────
export async function getSmPerpTrades() {
  return nansenFetch("/api/v1/smart-money/perp-trades", {
    limit: 50,
  });
}

// ── Smart Money DEX Trades ────────────────────────────────────
export async function getSmDexTrades(chains: string[] = ["ethereum", "solana", "base"]) {
  return nansenFetch("/api/v1/smart-money/dex-trades", {
    chains,
    limit: 50,
  });
}

// ── Token God Mode: Holders ───────────────────────────────────
export async function getTokenHolders(token: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/token/holders", {
    token,
    chain,
    limit: 20,
  });
}

// ── Token God Mode: Who Bought/Sold ───────────────────────────
export async function getTokenWhoBoughtSold(token: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/token/who-bought-sold", {
    token,
    chain,
    limit: 20,
  });
}

// ── Token God Mode: Flow Intelligence ─────────────────────────
export async function getTokenFlowIntelligence(token: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/token/flow-intelligence", {
    token,
    chain,
  });
}

// ── Profiler: Labels ──────────────────────────────────────────
export async function getProfilerLabels(address: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/profiler/labels", {
    address,
    chain,
  });
}

// ── Profiler: Related Wallets ─────────────────────────────────
export async function getProfilerRelatedWallets(address: string, chain: string = "ethereum") {
  return nansenFetch("/api/v1/profiler/related-wallets", {
    address,
    chain,
    limit: 10,
  });
}

// ── Agent: Expert Analysis ────────────────────────────────────
export async function getAgentExpert(prompt: string) {
  return nansenFetch("/api/v1/agent", {
    prompt,
    mode: "expert",
  });
}
