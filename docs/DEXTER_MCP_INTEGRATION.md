# Dexter MCP Integration — Solana DeFi Tools

## What Is Dexter MCP?

Dexter MCP is a **Solana DeFi MCP server** providing **60+ tools** across **10 toolsets**. Dual runtime: stdio for local agents, HTTPS for public connectors.

**Base URL:** `https://mcp.dexter.cash/mcp`

## Available Toolsets (10)

| Toolset | Tools | Purpose |
|---------|-------|---------|
| **solana** | 4 | Token resolve, swap preview/execute, balance check |
| **x402** | 6 | Jupiter quotes, trending tokens, video, GMGN, Twitter analysis |
| **markets** | 1 | OHLCV candle data from Birdeye v3 |
| **pumpstream** | 2 | Pump.fun search and spotlight |
| **onchain** | 2 | Wallet activity overview, entity insight |
| **wallet** | 2 | Resolve wallet, set session override |
| **general** | 2 | Web search (Tavily), page fetch |
| **hyperliquid** | 3 | Perp markets, trade, opt-in |
| **stream** | 1 | Public shout to stream |
| **codex** | CLI bridge | Codex start/reply/exec |

## Tool Details

### Solana Trading

| Tool | Description | Input |
|------|-------------|-------|
| `solana_resolve_token` | Resolve token symbol ↔ address | `{ token: "BONK" }` |
| `solana_swap_preview` | Preview swap output | `{ inputToken, outputToken, amount }` |
| `solana_swap_execute` | Execute token swap | `{ inputToken, outputToken, amount, wallet? }` |
| `solana_balance` | Check SOL or token balance | `{ wallet, token? }` |

### x402 Discovery

| Tool | Description | Input |
|------|-------------|-------|
| `x402_fetch` | Fetch URL with x402 payment | `{ url, method?, headers? }` |
| `x402_jupiter_quote` | Get Jupiter swap quote | `{ inputMint, outputMint, amount }` |
| `x402_solscan_trending` | Get trending tokens | `{ timeframe? }` |
| `x402_sora_video` | Generate AI video | `{ prompt, style? }` |
| `x402_gmgn_snapshot` | GMGN token snapshot | `{ token, timeframe? }` |
| `x402_twitter_analysis` | Analyze Twitter topics | `{ query, limit? }` |

### Market Data

| Tool | Description | Input |
|------|-------------|-------|
| `markets_fetch_ohlcv` | OHLCV candles from Birdeye | `{ pair, timeframe?, limit? }` |

### Pump.fun

| Tool | Description | Input |
|------|-------------|-------|
| `pumpstream_search` | Search Pump.fun tokens | `{ query, limit? }` |
| `pumpstream_spotlight` | Curated spotlight tokens | `{ category?, limit? }` |

### On-chain

| Tool | Description | Input |
|------|-------------|-------|
| `onchain_activity_overview` | Wallet activity summary | `{ wallet, timeframe? }` |
| `onchain_entity_insight` | Token/wallet deep insight | `{ entity }` |

### Hyperliquid

| Tool | Description | Input |
|------|-------------|-------|
| `hyperliquid_markets` | List perp markets | `{}` |
| `hyperliquid_perp_trade` | Execute perp trade | `{ ticker, side, size, tp?, sl? }` |
| `hyperliquid_opt_in` | Opt into market | `{ ticker }` |

### General

| Tool | Description | Input |
|------|-------------|-------|
| `search` | Web search via Tavily | `{ query, limit? }` |
| `fetch` | Fetch and parse page | `{ url, parse? }` |

## Access Tiers

| Tier | Access | Description |
|------|--------|-------------|
| `guest` | Read-only/demo | Shared bearer token |
| `member` | Authenticated | Personal Supabase session |
| `pro` | Role-gated | Paid trading surfaces |
| `dev` | Super Admin | Diagnostics only |

## Configure

Add to `.env.local`:

```bash
DEXTER_MCP_URL=https://mcp.dexter.cash/mcp
DEXTER_MCP_TOKEN=your_bearer_token
DEXTER_MCP_TOOLSETS=solana,x402,markets,pumpstream,onchain,wallet,general,hyperliquid,stream
DEXTER_MCP_TIMEOUT=30000
DEXTER_MCP_RETRY=true
DEXTER_MCP_MAX_RETRIES=3
```

## Usage in Agents

All agents natively have access to Dexter MCP tools:

```typescript
import {
  agentResolveToken,
  agentPreviewSwap,
  agentGetJupiterQuote,
  agentCheckBalance,
  agentGetTrendingTokens,
  agentAnalyzeWallet,
  agentSearchPumpfun,
  agentWebSearch,
} from "@/lib/mythx-backend/agent";

// Resolve token
const resolved = await agentResolveToken("BONK");

// Get trending tokens
const trending = await agentGetTrendingTokens("24h");

// Check wallet balance
const balance = await agentCheckBalance("wallet_address");

// Analyze wallet activity
const activity = await agentAnalyzeWallet("wallet_address");

// Search Pump.fun
const pumpTokens = await agentSearchPumpfun("cat");

// Web search
const results = await agentWebSearch("solana defi");
```

## Via API Proxy

```bash
# List all tools
curl http://localhost:3000/api/dexter-mcp/proxy

# Call a tool
curl -X POST http://localhost:3000/api/dexter-mcp/proxy \
  -H "Content-Type: application/json" \
  -d '{"tool": "solana_resolve_token", "args": {"token": "BONK"}}'
```

## Skills Auto-Injection

Dexter MCP skills are automatically injected into agent prompts when triggers match:

| Skill | Triggers |
|-------|----------|
| **Solana Trading** | "swap tokens", "check balance" |
| **x402 Discovery** | "jupiter quote", "trending tokens" |
| **Market Data** | "chart data", "ohlcv" |
| **Pump.fun** | "pump fun", "new token" |
| **On-chain** | "wallet activity" |
| **Hyperliquid** | "perp trade", "futures" |
| **Web Tools** | "search web", "fetch page" |

## Install Dexter MCP Server

```bash
git clone https://github.com/BranchManager69/dexter-mcp.git
cd dexter-mcp
npm install
cp .env.example .env
npm start  # HTTP on port 3930
```

## Health Check

```bash
curl -sS https://mcp.dexter.cash/mcp/health | jq
```

## Connect as MCP Server

```json
{
  "mcpServers": {
    "dexter": {
      "transport": "http",
      "url": "https://mcp.dexter.cash/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```
