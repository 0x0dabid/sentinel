/**
 * SENTINEL Layer 4: AI Deep Dive
 *
 * Uses `nansen agent` for AI-powered analysis of top signals,
 * plus token-level deep dives with flow intelligence,
 * holder quality, and buyer/seller analysis.
 */

import { nansen, formatUsd } from './config.js';

/**
 * Run deep dive analysis on top-scoring signals
 */
export async function deepDive(signals, maxSignals = 3) {
  console.log('\n[DEEP] Starting AI deep dive on top signals...');

  const topSignals = signals
    .sort((a, b) => b.convictionScore - a.convictionScore)
    .slice(0, maxSignals);

  const results = [];

  for (const signal of topSignals) {
    console.log(`  [DEEP] Analyzing ${signal.token} (conviction: ${signal.convictionScore})...`);

    const analysis = await analyzeSignal(signal);
    results.push(analysis);

    // Be gentle on API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Comprehensive analysis of a single signal
 */
async function analyzeSignal(signal) {
  const token = signal.token;
  const primaryChain = signal.chains[0];
  const result = {
    token,
    chains: signal.chains,
    convictionScore: signal.convictionScore,
    pattern: signal.pattern,
    agentAnalysis: null,
    holderQuality: null,
    buyerSeller: null,
    dexTrades: null,
    exitRisk: null,
  };

  // 1. AI Agent analysis (the differentiator - uses nansen agent --expert)
  console.log(`    [AGENT] Running nansen agent deep analysis on ${token}...`);
  const question = `Analyze why smart money is ${signal.pattern === 'capital_rotation' ? 'rotating capital into' : 'accumulating'} ${token} across ${signal.chains.join(', ')}. Consider: perp market positioning, holder quality trends, and whether this looks coordinated. What narrative might they be positioning for?`;

  const agentResult = nansen(
    `agent "${question.replace(/"/g, '\\"')}" --expert`,
    { timeout: 60000, quiet: true }
  );

  if (agentResult) {
    result.agentAnalysis = typeof agentResult === 'string' ? agentResult : JSON.stringify(agentResult);
    console.log(`    [AGENT] Got AI analysis (${typeof agentResult === 'string' ? agentResult.length : 'structured'})`);
  }

  // 2. Holder quality analysis
  console.log(`    [HOLDERS] Checking holder quality for ${token}...`);
  const holders = nansen(
    `research token holders --token ${token} --chain ${primaryChain} --smart-money --limit 15 --fields address,address_label,value_usd,ownership_percentage --pretty`,
    { quiet: true }
  );

  if (holders && Array.isArray(holders)) {
    const smCount = holders.length;
    const totalValue = holders.reduce((s, h) => s + (h.value_usd || 0), 0);
    result.holderQuality = {
      smartMoneyHolders: smCount,
      totalSmValue: totalValue,
      topHolders: holders.slice(0, 5).map(h => ({
        label: h.address_label || 'Unknown',
        value: formatUsd(h.value_usd),
        ownership: h.ownership_percentage?.toFixed(2) + '%',
      })),
    };
  }

  // 3. Buyer/seller analysis
  console.log(`    [FLOW] Analyzing buyers vs sellers for ${token}...`);
  const whoBoughtSold = nansen(
    `research token who-bought-sold --token ${token} --chain ${primaryChain} --limit 15 --fields address,address_label,bought_volume_usd,sold_volume_usd --pretty`,
    { quiet: true }
  );

  if (whoBoughtSold && Array.isArray(whoBoughtSold)) {
    const buyers = whoBoughtSold.filter(b => (b.bought_volume_usd || 0) > (b.sold_volume_usd || 0));
    const sellers = whoBoughtSold.filter(b => (b.sold_volume_usd || 0) > (b.bought_volume_usd || 0));

    result.buyerSeller = {
      totalBuyers: buyers.length,
      totalSellers: sellers.length,
      buyPressure: buyers.length / (buyers.length + sellers.length + 0.001),
      topBuyers: buyers.slice(0, 3).map(b => ({
        label: b.address_label || 'Unknown',
        volume: formatUsd(b.bought_volume_usd),
      })),
      topSellers: sellers.slice(0, 3).map(b => ({
        label: b.address_label || 'Unknown',
        volume: formatUsd(b.sold_volume_usd),
      })),
    };
  }

  // 4. Exit risk check
  console.log(`    [RISK] Checking exit signals for ${token}...`);
  const flowIntel = signal.flowIntelligence || nansen(
    `research token flow-intelligence --token ${token} --chain ${primaryChain} --pretty`,
    { quiet: true }
  );

  if (flowIntel) {
    let exitRisk = 'LOW';
    let riskFactors = [];

    // Check if smart traders are net negative
    const smFlow = flowIntel.smart_trader_net_flow_usd || signal.smFlow;
    if (smFlow && smFlow < -100000) {
      exitRisk = 'HIGH';
      riskFactors.push(`SM net outflow: ${formatUsd(smFlow)}`);
    } else if (smFlow && smFlow < 0) {
      exitRisk = 'MEDIUM';
      riskFactors.push(`Slight SM outflow: ${formatUsd(smFlow)}`);
    }

    // Check whale flow
    const whaleFlow = flowIntel.whale_net_flow_usd || signal.whaleFlow;
    if (whaleFlow && whaleFlow < -500000) {
      exitRisk = exitRisk === 'HIGH' ? 'CRITICAL' : 'HIGH';
      riskFactors.push(`Whale outflow: ${formatUsd(whaleFlow)}`);
    }

    result.exitRisk = { level: exitRisk, factors: riskFactors };
  }

  // 5. Recent DEX trades
  const dexTrades = nansen(
    `research token dex-trades --token ${token} --chain ${primaryChain} --limit 10 --fields block_timestamp,trader_address_label,estimated_value_usd --pretty`,
    { quiet: true }
  );

  if (dexTrades && Array.isArray(dexTrades)) {
    result.dexTrades = dexTrades.slice(0, 5).map(t => ({
      label: t.trader_address_label || 'Unknown',
      value: formatUsd(t.estimated_value_usd),
      time: t.block_timestamp,
    }));
  }

  console.log(`    [DEEP] ${token} analysis complete - Exit risk: ${result.exitRisk?.level || 'N/A'}`);
  return result;
}
