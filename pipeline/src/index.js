#!/usr/bin/env node

/**
 * SENTINEL — Smart Money Narrative Oracle
 * Autonomous multi-chain alpha pipeline using Nansen CLI
 *
 * Usage:
 *   sentinel           Full pipeline (scan + analyze + brief)
 *   sentinel scan      Quick scan only
 *   sentinel brief     Generate brief from latest scan data
 *   sentinel daemon    Run as daemon (auto-scan every N minutes)
 *   sentinel status    Show current config
 */

import { CONFIG, ALL_CHAINS } from './config.js';
import { runPipeline, runQuickScan } from './orchestrator.js';
import { startDaemon } from './scheduler.js';

const command = process.argv[2] || 'run';

async function main() {
  printBanner();

  switch (command) {
    case 'scan':
      await quickScan();
      break;

    case 'brief':
      await fullBrief();
      break;

    case 'daemon':
      startDaemon();
      break;

    case 'status':
      showStatus();
      break;

    case 'run':
    default:
      await fullBrief();
      break;
  }
}

function printBanner() {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   S E N T I N E L                             ║
  ║   Smart Money Narrative Oracle                 ║
  ║   Multi-Chain Alpha Pipeline                   ║
  ║   Powered by Nansen CLI                        ║
  ╚═══════════════════════════════════════════════╝
  `);
}

async function fullBrief() {
  try {
    const brief = await runPipeline();
    if (!brief) {
      console.log('\nNo brief generated. Check your Nansen API key and credits.');
    }
  } catch (err) {
    console.error(`\nFatal error: ${err.message}`);
    process.exit(1);
  }
}

async function quickScan() {
  try {
    const data = await runQuickScan();
    if (data) {
      console.log('\n[SCAN RESULTS]');
      console.log(`  Netflow signals: ${data.netflow?.length || 0}`);
      console.log(`  Fund holdings: ${data.holdings?.length || 0}`);
      console.log(`  SM perp trades: ${data.perpTrades?.length || 0}`);
      console.log(`  Perp markets: ${data.perpScreener?.length || 0}`);
      console.log(`  SM tokens: ${data.tokenScreener?.length || 0}`);
    }
  } catch (err) {
    console.error(`\nScan error: ${err.message}`);
    process.exit(1);
  }
}

function showStatus() {
  console.log('Configuration:');
  console.log(`  API Key: ${CONFIG.apiKey ? CONFIG.apiKey.slice(0, 8) + '...' : 'NOT SET'}`);
  console.log(`  Chains: ${CONFIG.chains.join(', ')}`);
  console.log(`  Scan interval: ${CONFIG.scanInterval} min`);
  console.log(`  Output dir: ${CONFIG.outputDir}`);
  console.log(`  Webhook: ${CONFIG.webhookUrl ? 'configured' : 'not set'}`);
  console.log(`  Telegram: ${CONFIG.telegramBotToken ? 'configured' : 'not set'}`);
  console.log('');
  console.log(`  All supported chains: ${ALL_CHAINS.join(', ')}`);
}

main().catch(err => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
