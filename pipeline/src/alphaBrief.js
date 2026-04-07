/**
 * SENTINEL Layer 5: Alpha Brief Generator
 *
 * Synthesizes all layers into a scored, actionable Alpha Brief.
 * Generates structured output + formatted text for delivery.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { CONFIG, timestamp, formatUsd, scoreSignal } from './config.js';

/**
 * Generate the full Alpha Brief from all layers
 */
export function generateBrief(scanData, clusterData, crossChainData, deepDiveData) {
  console.log('\n[BRIEF] Generating Alpha Brief...');

  const brief = {
    id: `sentinel-${timestamp()}`,
    generatedAt: new Date().toISOString(),
    summary: generateSummary(scanData, clusterData, crossChainData),
    topSignals: generateTopSignals(crossChainData, deepDiveData),
    coordination: clusterData,
    perpOverview: generatePerpOverview(scanData),
    riskAlerts: generateRiskAlerts(deepDiveData),
    rawStats: {
      tokensScanned: countUniqueTokens(scanData),
      chainsCovered: CONFIG.chains.length,
      smWalletsDetected: clusterData.labeledWallets?.length || 0,
      clustersFound: clusterData.clusters?.length || 0,
    },
  };

  // Calculate overall alpha score
  brief.alphaScore = calculateAlphaScore(brief);
  brief.narrative = predictNarrative(brief);

  // Save to file
  saveBrief(brief);

  // Format for display
  brief.formatted = formatBriefText(brief);

  console.log(`  [BRIEF] Alpha Brief generated (score: ${brief.alphaScore}/100)`);
  console.log(`  [BRIEF] Narrative prediction: ${brief.narrative.theme}`);

  return brief;
}

/**
 * Generate executive summary
 */
function generateSummary(scanData, clusterData, crossChainData) {
  const topAccumulations = crossChainData
    ?.filter(c => c.pattern === 'multi_chain_accumulation')
    .slice(0, 3) || [];

  const rotations = crossChainData
    ?.filter(c => c.pattern === 'capital_rotation')
    .slice(0, 3) || [];

  return {
    accumulation: topAccumulations.map(t => ({
      token: t.token,
      chains: t.chains,
      conviction: t.convictionScore,
      flow: formatUsd(t.totalNetFlow),
    })),
    rotations: rotations.map(t => ({
      token: t.token,
      chains: t.chains,
      pattern: t.details?.join('; '),
    })),
    coordinationLevel: clusterData.coordinationScore > 50 ? 'HIGH' :
                       clusterData.coordinationScore > 25 ? 'MEDIUM' : 'LOW',
    coordinationScore: clusterData.coordinationScore,
  };
}

/**
 * Generate top signals with full scoring
 */
function generateTopSignals(crossChainData, deepDiveData) {
  if (!crossChainData) return [];

  const signals = crossChainData.slice(0, 10);

  return signals.map(signal => {
    // Find matching deep dive data
    const deep = deepDiveData?.find(d => d.token === signal.token);

    const scored = {
      token: signal.token,
      convictionScore: signal.convictionScore,
      pattern: signal.pattern,
      chains: signal.chains,
      totalNetFlow: formatUsd(signal.totalNetFlow),
      fundCount: signal.fundCount,
      details: signal.details,
    };

    if (deep) {
      scored.exitRisk = deep.exitRisk?.level || 'UNKNOWN';
      scored.holderQuality = deep.holderQuality?.smartMoneyHolders || 0;
      scored.buyPressure = deep.buyerSeller?.buyPressure?.toFixed(2) || 'N/A';
      scored.agentInsight = deep.agentAnalysis
        ? truncate(deep.agentAnalysis, 200)
        : null;
    }

    return scored;
  });
}

/**
 * Generate perp market overview
 */
function generatePerpOverview(scanData) {
  if (!scanData.perpScreener || scanData.perpScreener.length === 0) return null;

  const hot = scanData.perpScreener.slice(0, 5).map(m => ({
    token: m.token,
    volume: formatUsd(m.volume),
    oi: formatUsd(m.oi),
    pressure: m.buySellPressure > 0 ? 'BULLISH' : 'BEARISH',
    funding: m.funding?.toFixed(6),
  }));

  const smPerpSummary = {};
  if (scanData.perpTrades) {
    for (const trade of scanData.perpTrades) {
      if (!smPerpSummary[trade.token]) smPerpSummary[trade.token] = { buys: 0, sells: 0, value: 0 };
      if (trade.side === 'BUY' || trade.side === 'Long') smPerpSummary[trade.token].buys++;
      else smPerpSummary[trade.token].sells++;
      smPerpSummary[trade.token].value += Math.abs(trade.valueUsd || 0);
    }
  }

  return { hotMarkets: hot, smPerpPositions: smPerpSummary };
}

/**
 * Generate risk alerts
 */
function generateRiskAlerts(deepDiveData) {
  if (!deepDiveData) return [];

  const alerts = [];
  for (const dd of deepDiveData) {
    if (dd.exitRisk && dd.exitRisk.level !== 'LOW') {
      alerts.push({
        token: dd.token,
        level: dd.exitRisk.level,
        factors: dd.exitRisk.factors,
      });
    }
  }

  return alerts.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.level] || 99) - (order[b.level] || 99);
  });
}

/**
 * Calculate overall alpha score
 */
function calculateAlphaScore(brief) {
  let score = 0;

  // Signal count and quality
  const signalCount = brief.topSignals?.length || 0;
  score += Math.min(signalCount * 5, 20);

  // Coordination score
  score += Math.min(brief.coordination?.coordinationScore || 0, 20);

  // Cross-chain conviction
  const highConviction = brief.topSignals?.filter(s => s.convictionScore >= 30) || [];
  score += Math.min(highConviction.length * 10, 20);

  // Fund involvement
  const fundSignals = brief.topSignals?.filter(s => s.fundCount > 0) || [];
  score += Math.min(fundSignals.length * 5, 15);

  // Agent insights available
  const withInsight = brief.topSignals?.filter(s => s.agentInsight) || [];
  score += Math.min(withInsight.length * 5, 15);

  // Risk factor (reduce score if high risk)
  const highRisks = brief.riskAlerts?.filter(r => r.level === 'HIGH' || r.level === 'CRITICAL') || [];
  score -= highRisks.length * 5;

  return Math.max(0, Math.min(Math.round(score), 100));
}

/**
 * Predict the narrative smart money is positioning for
 */
function predictNarrative(brief) {
  if (!brief.topSignals || brief.topSignals.length === 0) {
    return { theme: 'No clear narrative detected', confidence: 0, tokens: [] };
  }

  // Group tokens by pattern
  const accumulation = brief.topSignals.filter(s => s.pattern === 'multi_chain_accumulation');
  const rotation = brief.topSignals.filter(s => s.pattern === 'capital_rotation');
  const chainSpecific = brief.topSignals.filter(s => s.pattern === 'chain_specific_play');

  let theme = 'Mixed Signals';
  let confidence = 30;
  let details = [];

  if (accumulation.length >= 2) {
    theme = 'Coordinated Multi-Chain Accumulation';
    confidence = 70 + Math.min(accumulation.length * 5, 20);
    details.push(`${accumulation.length} tokens being accumulated across multiple chains`);
    details.push(`Top targets: ${accumulation.map(a => a.token).join(', ')}`);
  }

  if (rotation.length >= 2) {
    if (theme === 'Mixed Signals') {
      theme = 'Capital Rotation Phase';
      confidence = 50 + Math.min(rotation.length * 10, 30);
    }
    details.push(`${rotation.length} rotation signals detected`);
    details.push(`Rotation tokens: ${rotation.map(r => r.token).join(', ')}`);
  }

  if (chainSpecific.length >= 2) {
    const chains = [...new Set(chainSpecific.flatMap(s => s.chains))];
    details.push(`${chainSpecific.length} chain-specific plays on ${chains.join(', ')}`);
  }

  // Fund involvement boosts confidence
  const fundTokens = brief.topSignals.filter(s => s.fundCount > 0);
  if (fundTokens.length > 0) {
    confidence = Math.min(confidence + 10, 95);
    details.push(`Funds active in: ${fundTokens.map(f => f.token).join(', ')}`);
  }

  return {
    theme,
    confidence,
    details,
    tokens: brief.topSignals.slice(0, 5).map(s => s.token),
  };
}

/**
 * Format the brief as readable text
 */
function formatBriefText(brief) {
  const lines = [];

  lines.push('═══════════════════════════════════════════════════');
  lines.push('  SENTINEL ALPHA BRIEF');
  lines.push(`  ${new Date().toISOString()}`);
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');

  // Alpha Score
  lines.push(`  ALPHA SCORE: ${brief.alphaScore}/100`);
  lines.push('');

  // Narrative
  lines.push(`  NARRATIVE: ${brief.narrative.theme}`);
  lines.push(`  Confidence: ${brief.narrative.confidence}%`);
  if (brief.narrative.details?.length > 0) {
    for (const d of brief.narrative.details) {
      lines.push(`    - ${d}`);
    }
  }
  lines.push('');

  // Top Signals
  lines.push('  TOP SIGNALS:');
  lines.push('  ─────────────────────────────────────────────────');
  for (const signal of brief.topSignals || []) {
    lines.push(`  [${signal.convictionScore}] ${signal.token}`);
    lines.push(`    Pattern: ${signal.pattern}`);
    lines.push(`    Chains: ${signal.chains?.join(', ')}`);
    lines.push(`    Net Flow: ${signal.totalNetFlow}`);
    if (signal.fundCount > 0) lines.push(`    Funds: ${signal.fundCount} active`);
    if (signal.exitRisk) lines.push(`    Exit Risk: ${signal.exitRisk}`);
    if (signal.buyPressure) lines.push(`    Buy Pressure: ${signal.buyPressure}`);
    if (signal.agentInsight) lines.push(`    AI Insight: ${signal.agentInsight}`);
    lines.push('');
  }

  // Coordination
  lines.push('  COORDINATION:');
  lines.push(`    Score: ${brief.coordination?.coordinationScore || 0}/100`);
  if (brief.coordination?.coordinationDetails?.length > 0) {
    for (const d of brief.coordination.coordinationDetails) {
      lines.push(`    - ${d.detail}`);
    }
  }
  lines.push('');

  // Risk Alerts
  if (brief.riskAlerts?.length > 0) {
    lines.push('  RISK ALERTS:');
    for (const alert of brief.riskAlerts) {
      lines.push(`    [${alert.level}] ${alert.token}: ${alert.factors?.join(', ')}`);
    }
    lines.push('');
  }

  // Stats
  lines.push('  SCAN STATS:');
  lines.push(`    Tokens scanned: ${brief.rawStats.tokensScanned}`);
  lines.push(`    Chains covered: ${brief.rawStats.chainsCovered}`);
  lines.push(`    SM wallets found: ${brief.rawStats.smWalletsDetected}`);
  lines.push(`    Clusters: ${brief.rawStats.clustersFound}`);
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}

function saveBrief(brief) {
  const dir = CONFIG.outputDir;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filename = `brief-${timestamp()}.json`;
  const filepath = join(dir, filename);
  const { formatted, ...data } = brief;
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  [BRIEF] Saved to ${filepath}`);
}

function countUniqueTokens(scanData) {
  const tokens = new Set();
  if (scanData.netflow) for (const n of scanData.netflow) if (n.token) tokens.add(n.token);
  if (scanData.holdings) for (const h of scanData.holdings) if (h.token) tokens.add(h.token);
  if (scanData.tokenScreener) for (const t of scanData.tokenScreener) if (t.token) tokens.add(t.token);
  if (scanData.perpScreener) for (const p of scanData.perpScreener) if (p.token) tokens.add(p.token);
  return tokens.size;
}

function truncate(str, len) {
  if (typeof str !== 'string') return str;
  return str.length > len ? str.slice(0, len) + '...' : str;
}
