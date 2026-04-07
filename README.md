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
git clone https://github.com/0x0dabid/sentinel.git
cd sentinel

# 3. Install dashboard dependencies
npm install

# 4. Configure
cp .env.example .env
# Edit .env and add your NANSEN_API_KEY

# 5. Run the pipeline
node pipeline/src/index.js          # Full pipeline
node pipeline/src/index.js scan     # Quick scan only
node pipeline/src/index.js daemon   # Run as daemon (every 30 min)
node pipeline/src/index.js status   # Show config

# 6. Run the dashboard
npm run dev                         # Development
npm run build && npm start          # Production
```

## Project Structure

```
sentinel/
├── src/                    # Next.js dashboard (App Router)
│   ├── app/               # Pages: /, /signals, /coordination, /perps, /risks
│   ├── components/        # UI components
│   └── lib/               # Types, mock data
├── pipeline/              # Nansen CLI alpha pipeline
│   └── src/
│       ├── index.js       # CLI entry point
│       ├── scanner.js     # Layer 1: Multi-chain SM scanner
│       ├── clusterer.js   # Layer 2: Wallet clustering
│       ├── crossChain.js  # Layer 3: Cross-chain correlation
│       ├── deepDive.js    # Layer 4: AI deep dive
│       ├── alphaBrief.js  # Layer 5: Brief generator
│       ├── orchestrator.js# Pipeline coordinator
│       ├── scheduler.js   # Cron daemon
│       └── delivery.js    # Output delivery
├── public/                # Static assets
└── README.md
```

## Dashboard

Built with **Next.js 16 + Tailwind CSS**. Dark theme with neon lime (#C8FF00) accent.

- **Overview** — Alpha score, narrative prediction, top signals at a glance
- **Signals** — Filterable signal explorer with conviction scores and AI insights
- **Coordination** — Wallet cluster visualization and coordination scoring
- **Perps** — Perp market overview, hot markets, SM positioning
- **Risks** — Risk monitor with severity levels and factor breakdown

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
