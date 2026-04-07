/**
 * SENTINEL Orchestrator
 *
 * Runs all 5 layers in sequence and produces the final Alpha Brief.
 */

import { scanAll } from './scanner.js';
import { detectCoordination } from './clusterer.js';
import { analyzeCrossChain } from './crossChain.js';
import { deepDive } from './deepDive.js';
import { generateBrief } from './alphaBrief.js';
import { deliver } from './delivery.js';
import { CONFIG } from './config.js';

/**
 * Run the full SENTINEL pipeline
 */
export async function runPipeline(options = {}) {
  if (!CONFIG.apiKey) {
    console.error('[ERROR] NANSEN_API_KEY not set. Export it or add to .env');
    process.exit(1);
  }

  const startTime = Date.now();

  // Layer 1: Multi-Chain Scanner
  const scanData = await scanAll();

  if (!scanData || isScanEmpty(scanData)) {
    console.log('[ORCHESTRATOR] No scan data returned. Check API key and credits.');
    return null;
  }

  // Layer 2: Wallet Clustering & Coordination
  const clusterData = await detectCoordination(scanData);

  // Layer 3: Cross-Chain Correlation
  const crossChainData = await analyzeCrossChain(scanData);

  // Layer 4: AI Deep Dive (top 3 signals)
  const deepDiveData = await deepDive(crossChainData, options.deepDiveCount || 3);

  // Layer 5: Alpha Brief
  const brief = generateBrief(scanData, clusterData, crossChainData, deepDiveData);

  // Deliver
  await deliver(brief);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[ORCHESTRATOR] Full pipeline completed in ${duration}s`);

  return brief;
}

/**
 * Run only Layer 1 scan (quick mode)
 */
export async function runQuickScan() {
  if (!CONFIG.apiKey) {
    console.error('[ERROR] NANSEN_API_KEY not set.');
    process.exit(1);
  }

  const scanData = await scanAll();
  return scanData;
}

/**
 * Generate a brief from existing scan data (skip scan)
 */
export async function briefFromData(scanDataPath) {
  const { readFileSync } = await import('fs');
  const data = JSON.parse(readFileSync(scanDataPath, 'utf-8'));

  const clusterData = await detectCoordination(data);
  const crossChainData = await analyzeCrossChain(data);
  const deepDiveData = await deepDive(crossChainData, 3);
  const brief = generateBrief(data, clusterData, crossChainData, deepDiveData);

  await deliver(brief);
  return brief;
}

function isScanEmpty(scanData) {
  const total = (scanData.netflow?.length || 0)
    + (scanData.holdings?.length || 0)
    + (scanData.perpTrades?.length || 0)
    + (scanData.perpScreener?.length || 0)
    + (scanData.tokenScreener?.length || 0);
  return total === 0;
}
