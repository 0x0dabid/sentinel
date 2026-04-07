/**
 * SENTINEL Layer 2: Wallet Clustering & Coordination Detection
 *
 * For top smart money wallets detected in Layer 1:
 * - Fetch wallet labels
 * - Find related wallets
 * - Map counterparties
 * - Score coordination between wallets
 */

import { nansen, nansenBatch, shortAddr, SM_LABELS } from './config.js';

/**
 * Analyze top wallets from scan data and detect coordination
 */
export async function detectCoordination(scanData) {
  console.log('\n[CLUSTER] Starting wallet clustering & coordination detection...');

  // Extract unique smart money wallets from perp trades
  const wallets = extractTopWallets(scanData);
  console.log(`  [CLUSTER] Analyzing ${wallets.length} top SM wallets`);

  if (wallets.length === 0) {
    console.log('  [CLUSTER] No wallets to analyze');
    return { clusters: [], coordinationScore: 0 };
  }

  // Phase 1: Get labels for all wallets
  const labeledWallets = await labelWallets(wallets);

  // Phase 2: Find related wallets for top ones
  const clusters = await findRelatedWallets(labeledWallets.slice(0, 10));

  // Phase 3: Detect cross-wallet patterns
  const coordination = scoreCoordination(labeledWallets, clusters, scanData);

  console.log(`  [CLUSTER] Found ${clusters.length} clusters, coordination score: ${coordination.score}/100`);

  return {
    clusters,
    labeledWallets,
    coordinationScore: coordination.score,
    coordinationDetails: coordination.details,
  };
}

/**
 * Extract top wallets from scan data
 */
function extractTopWallets(scanData) {
  const walletMap = new Map();

  // From perp trades
  if (scanData.perpTrades) {
    for (const trade of scanData.perpTrades) {
      if (!trade.trader) continue;
      const addr = trade.trader;
      if (!walletMap.has(addr)) {
        walletMap.set(addr, { address: addr, trades: [], totalValue: 0 });
      }
      const w = walletMap.get(addr);
      w.trades.push(trade);
      w.totalValue += Math.abs(trade.valueUsd || 0);
    }
  }

  // Sort by total value, take top wallets
  return [...walletMap.values()]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 20);
}

/**
 * Label wallets using profiler
 */
async function labelWallets(wallets) {
  console.log('  [CLUSTER] Labeling wallets...');
  const commands = wallets.map(w => {
    const chain = w.address.startsWith('0x') ? 'ethereum' : 'solana';
    return `research profiler labels --address ${w.address} --chain ${chain} --pretty`;
  });

  const results = await nansenBatch(commands, 3);

  return wallets.map((w, i) => {
    const r = results[i];
    const labels = [];
    if (r && r.data && Array.isArray(r.data)) {
      for (const item of r.data) {
        if (item.label) labels.push(item.label);
        if (item.category) labels.push(item.category);
      }
    }
    return {
      ...w,
      labels: [...new Set(labels)],
      isSmartMoney: labels.some(l => SM_LABELS.some(sm => l.includes(sm))),
    };
  });
}

/**
 * Find related wallets for top wallets
 */
async function findRelatedWallets(wallets) {
  console.log('  [CLUSTER] Finding related wallets...');
  const clusters = [];

  for (const wallet of wallets.slice(0, 8)) {
    const chain = wallet.address.startsWith('0x') ? 'ethereum' : 'solana';

    const related = nansen(
      `research profiler related-wallets --address ${wallet.address} --chain ${chain} --limit 10 --pretty`,
      { quiet: true }
    );

    if (related && Array.isArray(related)) {
      clusters.push({
        anchor: wallet.address,
        anchorLabels: wallet.labels,
        related: related.map(r => ({
          address: r.address || r.related_address,
          label: r.address_label || r.label || '',
          score: r.score || r.confidence || 0,
        })),
        size: related.length + 1,
      });
    }

    // Small delay to be gentle on API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return clusters;
}

/**
 * Score coordination between detected wallets
 */
function scoreCoordination(wallets, clusters, scanData) {
  let score = 0;
  const details = [];

  // Check 1: Are multiple SM wallets trading the same token?
  const tokenTraders = new Map();
  if (scanData.perpTrades) {
    for (const trade of scanData.perpTrades) {
      if (!trade.token || !trade.trader) continue;
      if (!tokenTraders.has(trade.token)) tokenTraders.set(trade.token, new Set());
      tokenTraders.get(trade.token).add(trade.trader);
    }
  }

  for (const [token, traders] of tokenTraders) {
    if (traders.size >= 3) {
      score += 15;
      details.push({
        type: 'coordinated_trading',
        token,
        walletCount: traders.size,
        detail: `${traders.size} SM wallets trading ${token}`,
      });
    }
  }

  // Check 2: Are there clusters with multiple SM wallets?
  for (const cluster of clusters) {
    if (cluster.size >= 4) {
      score += 10;
      details.push({
        type: 'wallet_cluster',
        anchor: cluster.anchor,
        size: cluster.size,
        detail: `Cluster of ${cluster.size} related wallets around ${shortAddr(cluster.anchor)}`,
      });
    }
  }

  // Check 3: Same direction trades (all buying or all selling)
  if (scanData.perpTrades && scanData.perpTrades.length > 0) {
    const buys = scanData.perpTrades.filter(t => t.side === 'BUY' || t.side === 'Long').length;
    const sells = scanData.perpTrades.filter(t => t.side === 'SELL' || t.side === 'Short').length;
    const ratio = buys / (buys + sells + 0.001);

    if (ratio > 0.75) {
      score += 10;
      details.push({ type: 'directional_bias', direction: 'bullish', ratio: ratio.toFixed(2) });
    } else if (ratio < 0.25) {
      score += 10;
      details.push({ type: 'directional_bias', direction: 'bearish', ratio: ratio.toFixed(2) });
    }
  }

  return { score: Math.min(score, 100), details };
}
