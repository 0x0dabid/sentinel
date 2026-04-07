/**
 * SENTINEL Layer 1: Multi-Chain Smart Money Scanner
 *
 * Collects raw signal data across multiple chains:
 * - Smart money netflow per chain
 * - Smart money token holdings
 * - Smart money perp trades
 * - Perp market screener
 * - Token screener (SM filtered)
 */

import { nansen, nansenBatch, CONFIG, deduplicateTokens, formatUsd } from './config.js';

/**
 * Run the full Layer 1 scan across all configured chains
 */
export async function scanAll() {
  console.log('\n[SCAN] Starting multi-chain smart money scan...');
  const startTime = Date.now();

  const [netflowData, holdingsData, perpTrades, perpScreener, tokenScreener] = await Promise.all([
    scanSmartMoneyNetflow(),
    scanSmartMoneyHoldings(),
    scanPerpTrades(),
    scanPerpMarket(),
    scanTokenScreener(),
  ]);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SCAN] Complete in ${duration}s`);

  return {
    timestamp: new Date().toISOString(),
    netflow: netflowData,
    holdings: holdingsData,
    perpTrades,
    perpScreener,
    tokenScreener,
  };
}

/**
 * Scan smart money netflow across all chains
 */
async function scanSmartMoneyNetflow() {
  console.log('  [NETFLOW] Scanning SM netflow across chains...');
  const commands = CONFIG.chains.map(
    chain => `research smart-money netflow --chain ${chain} --labels "Smart Trader" --limit 30 --fields token_symbol,net_flow_24h_usd,net_flow_7d_usd,trader_count --pretty`
  );

  // Add fund-specific scan on major chains
  const fundCommands = ['ethereum', 'solana', 'base'].map(
    chain => `research smart-money netflow --chain ${chain} --labels "Fund" --limit 20 --fields token_symbol,net_flow_24h_usd,net_flow_7d_usd,trader_count --pretty`
  );

  const results = await nansenBatch([...commands, ...fundCommands]);

  // Parse results into a unified structure
  const allNetflows = [];
  for (const r of results) {
    if (!r.data || !Array.isArray(r.data)) continue;

    // Extract chain from the command
    const chainMatch = r.command.match(/--chain\s+(\w+)/);
    const chain = chainMatch ? chainMatch[1] : 'unknown';
    const isFund = r.command.includes('"Fund"');

    for (const item of r.data) {
      if (!item.token_symbol) continue;
      allNetflows.push({
        token: item.token_symbol,
        chain,
        netflow24h: item.net_flow_24h_usd || 0,
        netflow7d: item.net_flow_7d_usd || 0,
        traderCount: item.trader_count || 0,
        isFund,
      });
    }
  }

  const unique = deduplicateTokens(
    allNetflows.map(n => ({ ...n, token_symbol: n.token })),
    'token_symbol'
  );

  console.log(`  [NETFLOW] Found ${allNetflows.length} signals across ${CONFIG.chains.length} chains (${unique.length} unique tokens)`);
  return allNetflows;
}

/**
 * Scan smart money holdings (fund focus)
 */
async function scanSmartMoneyHoldings() {
  console.log('  [HOLDINGS] Scanning SM fund holdings...');
  const commands = ['ethereum', 'solana', 'base'].map(
    chain => `research smart-money holdings --chain ${chain} --labels "Fund" --limit 20 --fields token_symbol,value_usd,holders_count,balance_24h_percent_change --pretty`
  );

  const results = await nansenBatch(commands);
  const holdings = [];

  for (const r of results) {
    if (!r.data || !Array.isArray(r.data)) continue;
    const chainMatch = r.command.match(/--chain\s+(\w+)/);
    const chain = chainMatch ? chainMatch[1] : 'unknown';

    for (const item of r.data) {
      if (!item.token_symbol) continue;
      holdings.push({
        token: item.token_symbol,
        chain,
        valueUsd: item.value_usd || 0,
        holdersCount: item.holders_count || 0,
        change24h: item.balance_24h_percent_change || 0,
      });
    }
  }

  console.log(`  [HOLDINGS] Found ${holdings.length} fund holdings`);
  return holdings;
}

/**
 * Scan smart money perp trades
 */
async function scanPerpTrades() {
  console.log('  [PERPS] Scanning SM perp trades...');
  const data = nansen('research smart-money perp-trades --limit 50 --pretty');

  if (!data || !Array.isArray(data)) {
    console.log('  [PERPS] No perp trade data');
    return [];
  }

  const trades = data.map(t => ({
    token: t.token_symbol || t.symbol,
    side: t.side || t.action,
    valueUsd: t.estimated_value_usd || t.value_usd || 0,
    trader: t.trader_address_label || t.trader_address,
    pnl: t.pnl || 0,
    timestamp: t.block_timestamp || t.timestamp,
  }));

  console.log(`  [PERPS] Found ${trades.length} SM perp trades`);
  return trades;
}

/**
 * Scan perp market overview
 */
async function scanPerpMarket() {
  console.log('  [PERP-MARKET] Scanning perp screener...');
  const data = nansen('research perp screener --sort volume:desc --limit 20 --pretty');

  if (!data || !Array.isArray(data)) {
    console.log('  [PERP-MARKET] No perp screener data');
    return [];
  }

  const markets = data.map(m => ({
    token: m.token_symbol || m.symbol,
    volume: m.volume || 0,
    buyVolume: m.buy_volume || 0,
    sellVolume: m.sell_volume || 0,
    oi: m.open_interest || 0,
    funding: m.funding || 0,
    buySellPressure: m.buy_sell_pressure || 0,
  }));

  console.log(`  [PERP-MARKET] Found ${markets.length} perp markets`);
  return markets;
}

/**
 * Scan token screener with SM filter
 */
async function scanTokenScreener() {
  console.log('  [TOKENS] Scanning token screener (SM filter)...');
  const commands = ['solana', 'base', 'ethereum'].map(
    chain => `research token screener --chain ${chain} --smart-money --timeframe 24h --limit 20 --fields token_symbol,price_usd,price_change,volume,buy_volume,market_cap_usd --pretty`
  );

  const results = await nansenBatch(commands);
  const tokens = [];

  for (const r of results) {
    if (!r.data || !Array.isArray(r.data)) continue;
    const chainMatch = r.command.match(/--chain\s+(\w+)/);
    const chain = chainMatch ? chainMatch[1] : 'unknown';

    for (const item of r.data) {
      if (!item.token_symbol) continue;
      tokens.push({
        token: item.token_symbol,
        chain,
        price: item.price_usd || 0,
        priceChange: item.price_change || 0,
        volume: item.volume || 0,
        buyVolume: item.buy_volume || 0,
        mcap: item.market_cap_usd || 0,
      });
    }
  }

  console.log(`  [TOKENS] Found ${tokens.length} SM-filtered tokens`);
  return tokens;
}
