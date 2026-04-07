import { execSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname.slice(1) || '../.env' });

// Try multiple env paths
const envPaths = ['.env', '../.env', new URL('../.env', import.meta.url).pathname.replace(/^\/[A-Z]:/, '')];
for (const p of envPaths) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

export const CONFIG = {
  apiKey: process.env.NANSEN_API_KEY || '',
  scanInterval: parseInt(process.env.SCAN_INTERVAL || '30', 10),
  chains: process.env.CHAINS
    ? process.env.CHAINS.split(',').map(c => c.trim())
    : ['ethereum', 'solana', 'base', 'arbitrum', 'bnb', 'polygon', 'optimism'],
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '5', 10),
  outputDir: process.env.OUTPUT_DIR || './output',
  webhookUrl: process.env.WEBHOOK_URL || '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
};

export const ALL_CHAINS = [
  'ethereum', 'solana', 'base', 'bnb', 'arbitrum', 'polygon',
  'optimism', 'avalanche', 'linea', 'scroll', 'mantle', 'ronin',
  'sei', 'plasma', 'sonic', 'monad', 'hyperevm', 'iotaevm'
];

export const SM_LABELS = ['Smart Trader', 'Whale', 'Fund', 'Smart Trader: Defi', 'Token Veteran'];

/**
 * Run a nansen CLI command and return parsed JSON
 */
export function nansen(command, options = {}) {
  const timeout = options.timeout || 30000;
  const quiet = options.quiet || false;

  try {
    const result = execSync(`nansen ${command}`, {
      encoding: 'utf-8',
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, NANSEN_API_KEY: CONFIG.apiKey },
    });

    if (!result || !result.trim()) return null;

    // Handle NDJSON (--stream)
    if (result.includes('\n') && result.trim().startsWith('{')) {
      const lines = result.trim().split('\n').filter(l => l.trim());
      const parsed = [];
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.success && obj.data) parsed.push(...(Array.isArray(obj.data) ? obj.data : [obj.data]));
          else if (obj.success) parsed.push(obj);
        } catch {}
      }
      return parsed;
    }

    const parsed = JSON.parse(result);
    if (parsed.success === false) {
      if (!quiet) console.error(`  [NANSEN ERROR] ${parsed.error || 'Unknown error'}`);
      return null;
    }
    return parsed.data || parsed;
  } catch (err) {
    if (!quiet && !options.silent) {
      const msg = err.stderr?.toString() || err.message;
      if (!msg.includes('CREDITS_EXHAUSTED')) {
        console.error(`  [CLI ERROR] ${command}: ${msg.split('\n')[0]}`);
      } else {
        console.error('  [CRITICAL] Credits exhausted! Stopping all API calls.');
        process.exit(1);
      }
    }
    return null;
  }
}

/**
 * Run nansen commands in batches with concurrency control
 */
export async function nansenBatch(commands, concurrency = CONFIG.maxConcurrent) {
  const results = [];
  for (let i = 0; i < commands.length; i += concurrency) {
    const batch = commands.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(cmd => Promise.resolve().then(() => nansen(cmd)))
    );
    results.push(...batchResults.map((r, idx) => ({
      command: batch[idx],
      data: r,
    })));
    // Small delay between batches to avoid rate limits
    if (i + concurrency < commands.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return results;
}

/**
 * Score a signal based on multiple factors
 */
export function scoreSignal(signal) {
  let score = 0;
  const maxScore = 100;

  // Smart money count (0-25)
  if (signal.smWallets) score += Math.min(signal.smWallets * 3, 25);

  // Cross-chain presence (0-20)
  if (signal.chains) score += Math.min(signal.chains.length * 7, 20);

  // Fund involvement (0-15)
  if (signal.fundCount) score += Math.min(signal.fundCount * 8, 15);

  // Net flow strength (0-20)
  if (signal.totalNetFlowUsd) {
    const flowScore = Math.min(Math.abs(signal.totalNetFlowUsd) / 100000, 20);
    score += flowScore;
  }

  // Coordination bonus (0-10)
  if (signal.coordinationScore) score += Math.min(signal.coordinationScore * 2, 10);

  // Perp alignment (0-10)
  if (signal.perpAlignment) score += 10;

  return Math.round(Math.min(score, maxScore));
}

/**
 * Deduplicate tokens across chains
 */
export function deduplicateTokens(items, key = 'token_symbol') {
  const seen = new Map();
  for (const item of items) {
    if (!item || !item[key]) continue;
    const existing = seen.get(item[key]);
    if (!existing) {
      seen.set(item[key], { ...item, chains: [item.chain], sources: 1 });
    } else {
      existing.chains = [...new Set([...(existing.chains || []), item.chain])];
      existing.sources += 1;
      if (Math.abs(item.net_flow_24h_usd || 0) > Math.abs(existing.net_flow_24h_usd || 0)) {
        Object.assign(existing, item, { chains: existing.chains, sources: existing.sources });
      }
    }
  }
  return [...seen.values()];
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function shortAddr(addr) {
  if (!addr) return 'unknown';
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}..${addr.slice(-6)}`;
}

export function formatUsd(val) {
  if (!val) return '$0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}
