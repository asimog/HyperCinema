// Dexter MCP skills - auto-injected into agent prompts
export interface DexterMCPSkill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  instructions: string;
  category: string;
}

// All Dexter MCP skills
export const DEXTER_MCP_SKILLS: DexterMCPSkill[] = [
  {
    id: "solana-trading",
    name: "Solana Trading",
    description: "Execute token swaps, preview outputs, check balances on Solana.",
    triggers: [
      "swap tokens",
      "swap sol",
      "check balance",
      "resolve token",
      "trading",
    ],
    instructions: `Solana trading tools:
- solana_resolve_token: Get token mint from symbol or vice versa
- solana_swap_preview: Preview swap output before executing
- solana_swap_execute: Execute token swap on Solana DEX
- solana_balance: Check SOL or SPL token balance for wallet
Always preview swaps before executing. Use resolve_token for unknown symbols.`,
    category: "solana.trading",
  },
  {
    id: "x402-discovery",
    name: "x402 Discovery",
    description: "Paid discovery tools for Jupiter quotes, trending tokens, video generation.",
    triggers: [
      "jupiter quote",
      "trending tokens",
      "generate video",
      "gmgn snapshot",
      "twitter analysis",
    ],
    instructions: `x402 discovery tools:
- x402_fetch: Fetch URL with x402 payment attached
- x402_jupiter_quote: Get best route quote from Jupiter
- x402_solscan_trending: Get trending tokens by timeframe
- x402_sora_video: Generate AI video from prompt
- x402_gmgn_snapshot: Get GMGN analytics snapshot
- x402_twitter_analysis: Analyze Twitter topics and sentiment`,
    category: "x402.discovery",
  },
  {
    id: "market-data",
    name: "Market Data",
    description: "OHLCV candle data from Birdeye v3.",
    triggers: [
      "chart data",
      "candle data",
      "ohlcv",
      "price history",
    ],
    instructions: `Market data tools:
- markets_fetch_ohlcv: Get OHLCV candles from Birdeye v3
  Supports timeframes: 1m, 5m, 15m, 1h, 4h, 1d
  Auto-selects top liquidity pair if address unknown`,
    category: "markets",
  },
  {
    id: "pumpfun-analytics",
    name: "Pump.fun Analytics",
    description: "Pump.fun token search and spotlight data.",
    triggers: [
      "pump fun",
      "new token",
      "pumpstream",
      "spotlight",
    ],
    instructions: `Pump.fun analytics:
- pumpstream_search: Search for tokens by name/symbol
- pumpstream_spotlight: Get curated spotlight tokens
Filter by USD MC floors, mint/symbol filters, pagination.`,
    category: "pumpstream",
  },
  {
    id: "onchain-analytics",
    name: "On-chain Analytics",
    description: "Wallet activity and entity insight via Supabase.",
    triggers: [
      "wallet activity",
      "entity insight",
      "wallet analysis",
    ],
    instructions: `On-chain analysis:
- onchain_activity_overview: Get wallet activity summary
- onchain_entity_insight: Deep insight into token or wallet
Uses Supabase auth passthrough for authenticated access.`,
    category: "onchain",
  },
  {
    id: "hyperliquid-trading",
    name: "Hyperliquid Trading",
    description: "Perpetual futures trading on Hyperliquid.",
    triggers: [
      "hyperliquid",
      "perp trade",
      "futures",
      "leverage",
    ],
    instructions: `Hyperliquid perp trading:
- hyperliquid_markets: List available perpetual markets
- hyperliquid_perp_trade: Execute perp with optional TP/SL
- hyperliquid_opt_in: Opt into new market
Always check markets first before trading. Set take profit and stop loss.`,
    category: "hyperliquid",
  },
  {
    id: "web-tools",
    name: "Web Search & Fetch",
    description: "Tavily-backed web search and page fetching.",
    triggers: [
      "search web",
      "fetch page",
      "look up",
    ],
    instructions: `General web tools:
- search: Tavily-backed web search
- fetch: Fetch and auto-parse web page to markdown
Use for research, token info, news, and documentation.`,
    category: "general",
  },
];

// Get all skills as formatted string
export function getDexterMCPSkills(): string {
  return DEXTER_MCP_SKILLS.map(
    (skill) => `## ${skill.name} (${skill.category})\n${skill.description}\n\n${skill.instructions}`,
  ).join("\n\n");
}

// Find matching skills for query
export function findMatchingSkills(query: string): DexterMCPSkill[] {
  const lowerQuery = query.toLowerCase();
  return DEXTER_MCP_SKILLS.filter((skill) =>
    skill.triggers.some((trigger) => lowerQuery.includes(trigger)),
  );
}
