/**
 * SENTINEL Delivery Module
 *
 * Delivers Alpha Briefs via:
 * - Console output
 * - JSON file (automatic)
 * - Webhook (optional)
 * - Telegram (optional)
 */

import { CONFIG, formatUsd } from './config.js';

/**
 * Deliver a brief through all configured channels
 */
export async function deliver(brief) {
  // Always print to console
  if (brief.formatted) {
    console.log('\n' + brief.formatted);
  }

  // Webhook delivery
  if (CONFIG.webhookUrl) {
    await deliverWebhook(brief);
  }

  // Telegram delivery
  if (CONFIG.telegramBotToken && CONFIG.telegramChatId) {
    await deliverTelegram(brief);
  }
}

/**
 * Send brief to a webhook
 */
async function deliverWebhook(brief) {
  try {
    const payload = {
      text: brief.formatted,
      alphaScore: brief.alphaScore,
      narrative: brief.narrative?.theme,
      topTokens: brief.topSignals?.slice(0, 5).map(s => s.token),
      timestamp: brief.generatedAt,
    };

    const response = await fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('  [DELIVER] Webhook delivered');
    } else {
      console.error(`  [DELIVER] Webhook failed: ${response.status}`);
    }
  } catch (err) {
    console.error(`  [DELIVER] Webhook error: ${err.message}`);
  }
}

/**
 * Send brief to Telegram
 */
async function deliverTelegram(brief) {
  try {
    // Format for Telegram (Markdown)
    const lines = [];
    lines.push('*SENTINEL ALPHA BRIEF*');
    lines.push(`Alpha Score: *${brief.alphaScore}/100*`);
    lines.push(`Narrative: _${brief.narrative?.theme}_`);
    lines.push(`Confidence: ${brief.narrative?.confidence}%`);
    lines.push('');

    if (brief.topSignals?.length > 0) {
      lines.push('*Top Signals:*');
      for (const s of brief.topSignals.slice(0, 5)) {
        lines.push(`[${s.convictionScore}] *${s.token}* - ${s.pattern}`);
        lines.push(`  Chains: ${s.chains?.join(', ')} | Flow: ${s.totalNetFlow}`);
        if (s.exitRisk) lines.push(`  Risk: ${s.exitRisk}`);
      }
      lines.push('');
    }

    if (brief.riskAlerts?.length > 0) {
      lines.push('*Risk Alerts:*');
      for (const a of brief.riskAlerts) {
        lines.push(`[${a.level}] ${a.token}: ${a.factors?.join(', ')}`);
      }
    }

    const text = lines.join('\n');

    // Split into chunks if too long (Telegram limit: 4096)
    const chunks = [];
    for (let i = 0; i < text.length; i += 4000) {
      chunks.push(text.slice(i, i + 4000));
    }

    for (const chunk of chunks) {
      await fetch(`https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.telegramChatId,
          text: chunk,
          parse_mode: 'Markdown',
        }),
      });
    }

    console.log('  [DELIVER] Telegram delivered');
  } catch (err) {
    console.error(`  [DELIVER] Telegram error: ${err.message}`);
  }
}
