/**
 * SENTINEL Layer 3: Cross-Chain Correlation Engine
 *
 * Detects:
 * - Smart money accumulating same token across multiple chains (high conviction)
 * - Capital rotation (selling chain A, buying chain B)
 * - Chain-specific plays (only one chain active)
 * - Fund cross-chain positioning
 */

import { nansen, nansenBatch, formatUsd } from './config.js';

/**
 * Analyze cross-chain correlations from scan data
 */
export async function analyzeCrossChain(scanData) {
  console.log('\n[XCHAIN] Starting cross-chain correlation analysis...');

  const tokenMap = buildTokenMap(scanData);
  const correlations = [];

  for (const [token, chains] of tokenMap) {
    const analysis = analyzeToken(token, chains);

    // Only include tokens with meaningful signals
    if (analysis.signalStrength >= 2) {
      correlations.push(analysis);
    }
  }

  // Sort by conviction score
  correlations.sort((a, b) => b.convictionScore - a.convictionScore);

  // For top correlations, get deeper flow intelligence
  const topCorrelations = correlations.slice(0, 5);
  await enrichWithFlowIntelligence(topCorrelations);

  console.log(`  [XCHAIN] Found ${correlations.length} cross-chain correlations`);
  console.log(`  [XCHAIN] Top signals:`);
  for (const c of correlations.slice(0, 3)) {
    console.log(`    ${c.token}: ${c.pattern} across ${c.chains.length} chains (conviction: ${c.convictionScore})`);
  }

  return correlations;
}

/**
 * Build a map of token -> chain data from scan results
 */
function buildTokenMap(scanData) {
  const tokenMap = new Map();

  // From netflow data
  if (scanData.netflow) {
    for (const item of scanData.netflow) {
      if (!item.token) continue;
      if (!tokenMap.has(item.token)) tokenMap.set(item.token, []);
      tokenMap.get(item.token).push({
        chain: item.chain,
        netflow24h: item.netflow24h,
        netflow7d: item.netflow7d,
        traderCount: item.traderCount,
        isFund: item.isFund,
        source: 'netflow',
      });
    }
  }

  // From holdings data
  if (scanData.holdings) {
    for (const item of scanData.holdings) {
      if (!item.token) continue;
      if (!tokenMap.has(item.token)) tokenMap.set(item.token, []);
      tokenMap.get(item.token).push({
        chain: item.chain,
        valueUsd: item.valueUsd,
        holdersCount: item.holdersCount,
        change24h: item.change24h,
        isFund: true,
        source: 'holdings',
      });
    }
  }

  // From token screener
  if (scanData.tokenScreener) {
    for (const item of scanData.tokenScreener) {
      if (!item.token) continue;
      if (!tokenMap.has(item.token)) tokenMap.set(item.token, []);
      // Don't duplicate if already present from netflow
      const existing = tokenMap.get(item.token);
      const hasThisChain = existing.some(e => e.chain === item.chain && e.source === 'screener');
      if (!hasThisChain) {
        existing.push({
          chain: item.chain,
          price: item.price,
          priceChange: item.priceChange,
          volume: item.volume,
          mcap: item.mcap,
          source: 'screener',
        });
      }
    }
  }

  return tokenMap;
}

/**
 * Analyze a single token's cross-chain pattern
 */
function analyzeToken(token, chainData) {
  const uniqueChains = [...new Set(chainData.map(d => d.chain))];
  const netflowEntries = chainData.filter(d => d.netflow24h !== undefined);
  const fundEntries = chainData.filter(d => d.isFund);

  // Determine the pattern
  let pattern = 'neutral';
  let signalStrength = 0;
  let details = [];

  // Pattern 1: Multi-chain accumulation (same direction across chains)
  if (netflowEntries.length >= 2) {
    const positive = netflowEntries.filter(d => d.netflow24h > 0);
    const negative = netflowEntries.filter(d => d.netflow24h < 0);

    if (positive.length >= 2 && positive.length > negative.length) {
      pattern = 'multi_chain_accumulation';
      signalStrength += 4;
      details.push(`SM accumulating on ${positive.map(d => d.chain).join(', ')}`);

      // Extra conviction if funds are involved
      if (fundEntries.length > 0) {
        signalStrength += 2;
        details.push(`Funds active on ${fundEntries.map(d => d.chain).join(', ')}`);
      }
    }

    // Pattern 2: Capital rotation (positive on some chains, negative on others)
    if (positive.length >= 1 && negative.length >= 1) {
      pattern = 'capital_rotation';
      signalStrength += 3;
      details.push(`Rotation: buying on ${positive.map(d => d.chain).join(', ')}, selling on ${negative.map(d => d.chain).join(', ')}`);
    }
  }

  // Pattern 3: Chain-specific play (strong signal on one chain only)
  if (uniqueChains.length === 1 && netflowEntries.length > 0) {
    const nf = netflowEntries[0];
    if (Math.abs(nf.netflow24h) > 100000) {
      pattern = 'chain_specific_play';
      signalStrength += 2;
      details.push(`Strong single-chain signal on ${nf.chain}: ${formatUsd(nf.netflow24h)}`);
    }
  }

  // Pattern 4: Cross-chain with perp alignment
  // (will be enriched later)

  // Calculate conviction score
  let convictionScore = signalStrength;
  convictionScore += Math.min(uniqueChains.length * 2, 10); // More chains = higher conviction
  convictionScore += Math.min(fundEntries.length * 3, 6);   // Fund involvement

  // Total net flow magnitude
  const totalFlow = netflowEntries.reduce((sum, d) => sum + (d.netflow24h || 0), 0);
  convictionScore += Math.min(Math.abs(totalFlow) / 500000, 5);

  return {
    token,
    chains: uniqueChains,
    chainData,
    pattern,
    signalStrength,
    convictionScore: Math.round(Math.min(convictionScore, 100)),
    totalNetFlow: totalFlow,
    details,
    fundCount: fundEntries.length,
  };
}

/**
 * Enrich top correlations with flow intelligence data
 */
async function enrichWithFlowIntelligence(correlations) {
  console.log('  [XCHAIN] Enriching top signals with flow intelligence...');

  for (const corr of correlations) {
    const chain = corr.chains[0]; // Use primary chain
    const token = corr.token;

    const data = nansen(
      `research token flow-intelligence --token ${token} --chain ${chain} --pretty`,
      { quiet: true }
    );

    if (data) {
      corr.flowIntelligence = data;

      // Extract label-level flows
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.smart_trader_net_flow_usd !== undefined) {
            corr.smFlow = item.smart_trader_net_flow_usd;
          }
          if (item.whale_net_flow_usd !== undefined) {
            corr.whaleFlow = item.whale_net_flow_usd;
          }
        }
      } else if (typeof data === 'object') {
        corr.smFlow = data.smart_trader_net_flow_usd;
        corr.whaleFlow = data.whale_net_flow_usd;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
