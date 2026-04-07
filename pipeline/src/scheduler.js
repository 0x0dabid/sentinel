/**
 * SENTINEL Scheduler
 *
 * Runs the full pipeline on a configurable interval.
 */

import cron from 'node-cron';
import { CONFIG } from './config.js';
import { runPipeline } from './orchestrator.js';

let isRunning = false;

/**
 * Start the daemon that runs the pipeline on schedule
 */
export function startDaemon(intervalMinutes = CONFIG.scanInterval) {
  console.log(`[DAEMON] Starting SENTINEL daemon (interval: ${intervalMinutes} min)`);
  console.log(`[DAEMON] Chains: ${CONFIG.chains.join(', ')}`);
  console.log('[DAEMON] Press Ctrl+C to stop\n');

  // Run immediately on start
  runScheduledPipeline();

  // Schedule recurring runs
  const cronExpr = `*/${intervalMinutes} * * * *`;
  cron.schedule(cronExpr, () => {
    runScheduledPipeline();
  });

  // Keep alive
  process.on('SIGINT', () => {
    console.log('\n[DAEMON] Stopping SENTINEL...');
    process.exit(0);
  });
}

async function runScheduledPipeline() {
  if (isRunning) {
    console.log('[DAEMON] Pipeline already running, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log(`\n[DAEMON] === Pipeline run started at ${new Date().toISOString()} ===`);
    await runPipeline();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[DAEMON] === Pipeline completed in ${duration}s ===\n`);
  } catch (err) {
    console.error(`[DAEMON] Pipeline error: ${err.message}`);
  } finally {
    isRunning = false;
  }
}
