# SENTINEL — Smart Money Narrative Oracle

> **Autonomous multi-chain alpha pipeline built on Nansen CLI.**
> Detects smart money coordination, cross-chain capital flows, and predicts the narrative SM is positioning for — powered by AI deep analysis.

## What It Does

SENTINEL runs a 5-layer analysis pipeline:

| Layer | Module | What It Does | Nansen Endpoints |
|-------|--------|-------------|-----------------|
| 1 | Scanner | Multi-chain SM netflow, fund holdings, perp trades, token screener | `sm netflow`, `sm holdings`, `sm perp-trades`, `perp screener`, `token screener` |
| 2 | Clusterer | Wallet labeling, related wallet discovery, coordination scoring | `profiler labels`, `profiler related-wallets` |
| 3 | Cross-Chain | Detects multi-chain accumulation, capital rotation, chain-specific plays | `token flow-intelligence` |
| 4 | Deep Dive | AI-powered analysis of top signals + holder quality + exit risk | `agent --expert`, `token holders`, `token who-bought-sold`, `token dex-trades` |
| 5 | Alpha Brief | Synthesizes everything into scored, actionable intelligence | — |

## Why It's Different

- **Only project using `nansen agent --expert`** — the most premium CLI feature (750 credits)
- **Predictive, not detective** — predicts narratives, doesn't just alert
- **15 Nansen CLI endpoints** chained per cycle — most comprehensive usage
- **Cross-chain correlation** — no previous winner analyzed SM across chains
- **Fully autonomous** — runs on cron, no manual trigger needed

## Quick Start

```bash
# 1. Install nansen-cli globally
npm install -g nansen-cli

# 2. Clone and setup
cd sentinel
npm install

# 3. Configure
cp .env.example .env
# Edit .env and add your NANSEN_API_KEY

# 4. Run
node src/index.js          # Full pipeline
node src/index.js scan     # Quick scan only
node src/index.js daemon   # Run as daemon (every 30 min)
node src/index.js status   # Show config
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NANSEN_API_KEY` | — | Your Nansen API key (required) |
| `CHAINS` | ethereum, solana, base, arbitrum, bnb, polygon, optimism | Chains to scan |
| `SCAN_INTERVAL` | 30 | Minutes between daemon scans |
| `OUTPUT_DIR` | ./output | Where briefs are saved |
| `WEBHOOK_URL` | — | Optional webhook for delivery |
| `TELEGRAM_BOT_TOKEN` | — | Optional Telegram bot token |
| `TELEGRAM_CHAT_ID` | — | Optional Telegram chat ID |

## Output

Each run generates an Alpha Brief:

```
═══════════════════════════════════════════════════
  SENTINEL ALPHA BRIEF
  2026-04-07T20:30:00.000Z
═══════════════════════════════════════════════════

  ALPHA SCORE: 72/100

  NARRATIVE: Coordinated Multi-Chain Accumulation
  Confidence: 80%
    - 3 tokens being accumulated across multiple chains
    - Top targets: TOKEN_A, TOKEN_B, TOKEN_C
    - Funds active in: TOKEN_A, TOKEN_B

  TOP SIGNALS:
  ─────────────────────────────────────────────────
  [45] TOKEN_A
    Pattern: multi_chain_accumulation
    Chains: ethereum, solana, base
    Net Flow: $2.5M
    Funds: 3 active
    Exit Risk: LOW
    Buy Pressure: 0.82
    AI Insight: Smart money appears to be positioning for...

  COORDINATION:
    Score: 65/100
    - 5 SM wallets trading TOKEN_A
    - Cluster of 6 related wallets around 0x1234...

  RISK ALERTS:
    [MEDIUM] TOKEN_C: Slight SM outflow: -$150K
═══════════════════════════════════════════════════
```

## Architecture

```
src/
├── index.js          CLI entry point
├── config.js         Config, nansen CLI wrapper, utils
├── scanner.js        Layer 1: Multi-chain SM scanner
├── clusterer.js      Layer 2: Wallet clustering
├── crossChain.js     Layer 3: Cross-chain correlation
├── deepDive.js       Layer 4: AI deep dive
├── alphaBrief.js     Layer 5: Brief generator
├── orchestrator.js   Pipeline coordinator
├── scheduler.js      Cron daemon
└── delivery.js       Output delivery (console/webhook/Telegram)
```

## Credit Usage

A single full pipeline run uses approximately:
- Layer 1: ~20 API calls (netflow + holdings + perps + tokens across chains)
- Layer 2: ~15 API calls (wallet labels + related wallets)
- Layer 3: ~5 API calls (flow intelligence for top signals)
- Layer 4: ~15 API calls (agent --expert + holders + who-bought-sold + dex-trades for top 3)
- **Total: ~55 API calls per run**

Recommended: Run on 30-60 min intervals with 100K+ credits.

## License

MIT © 0x0dabid
