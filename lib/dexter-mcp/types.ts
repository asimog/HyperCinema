// Dexter MCP types - 60+ Solana DeFi tools across 10 toolsets
import { z } from "zod";

// ── Solana Trading Tools ────────────────────────────────────

export const SolanaResolveTokenSchema = z.object({
  token: z.string().describe("Token address or symbol"),
});

export const SolanaSwapPreviewSchema = z.object({
  inputToken: z.string().describe("Input token mint address"),
  outputToken: z.string().describe("Output token mint address"),
  amount: z.number().describe("Amount to swap"),
  slippageBps: z.number().optional().default(50),
});

export const SolanaSwapExecuteSchema = z.object({
  inputToken: z.string(),
  outputToken: z.string(),
  amount: z.number(),
  slippageBps: z.number().optional().default(50),
  wallet: z.string().optional().describe("Wallet address to swap from"),
});

export const SolanaBalanceSchema = z.object({
  wallet: z.string().describe("Wallet address"),
  token: z.string().optional().describe("Token mint (optional for SOL)"),
});

// ── x402 Payment & Discovery Tools ──────────────────────────

export const X402FetchSchema = z.object({
  url: z.string().url().describe("URL to fetch"),
  method: z.string().optional().default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
});

export const X402JupiterQuoteSchema = z.object({
  inputMint: z.string(),
  outputMint: z.string(),
  amount: z.number(),
});

export const X402SolscanTrendingSchema = z.object({
  limit: z.number().optional().default(20),
  timeframe: z.enum(["1h", "6h", "24h", "7d"]).optional().default("24h"),
});

export const X402SoraVideoSchema = z.object({
  prompt: z.string().describe("Video generation prompt"),
  style: z.string().optional(),
});

export const X402GmgnSnapshotSchema = z.object({
  token: z.string().describe("Token address"),
  timeframe: z.string().optional().default("24h"),
});

export const X402TwitterAnalysisSchema = z.object({
  query: z.string().describe("Twitter topic or handle"),
  limit: z.number().optional().default(20),
});

// ── Market Data Tools ───────────────────────────────────────

export const MarketsFetchOHLCVSchema = z.object({
  pair: z.string().describe("Trading pair or token address"),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).optional().default("1h"),
  limit: z.number().optional().default(100),
});

// ── Pump.fun Stream Tools ───────────────────────────────────

export const PumpstreamSearchSchema = z.object({
  query: z.string().describe("Search query for tokens"),
  limit: z.number().optional().default(20),
});

export const PumpstreamSpotlightSchema = z.object({
  category: z.string().optional(),
  limit: z.number().optional().default(10),
});

// ── On-chain Activity Tools ─────────────────────────────────

export const OnchainActivitySchema = z.object({
  wallet: z.string().describe("Wallet address to analyze"),
  timeframe: z.string().optional().default("7d"),
});

export const OnchainEntityInsightSchema = z.object({
  entity: z.string().describe("Token or wallet address"),
});

// ── Wallet Management Tools ─────────────────────────────────

export const WalletResolveSchema = z.object({
  address: z.string().describe("Wallet address to resolve"),
});

export const WalletSetOverrideSchema = z.object({
  wallet: z.string().describe("Wallet address to set as active"),
});

// ── General Web Tools ───────────────────────────────────────

export const GeneralSearchSchema = z.object({
  query: z.string().describe("Search query"),
  limit: z.number().optional().default(10),
});

export const GeneralFetchSchema = z.object({
  url: z.string().url(),
  parse: z.boolean().optional().default(true),
});

// ── Hyperliquid Trading Tools ───────────────────────────────

export const HyperliquidMarketsSchema = z.object({});

export const HyperliquidPerpTradeSchema = z.object({
  ticker: z.string().describe("Perpetual ticker, e.g. BTC"),
  side: z.enum(["buy", "sell"]),
  size: z.number().describe("Position size"),
  tp: z.number().optional().describe("Take profit price"),
  sl: z.number().optional().describe("Stop loss price"),
});

export const HyperliquidOptInSchema = z.object({
  ticker: z.string(),
});

// ── Stream Shout Tools ──────────────────────────────────────

export const StreamPublicShoutSchema = z.object({
  message: z.string().describe("Shout message"),
  amount: z.number().optional().describe("Tip amount"),
});

// ── Tool Registry ───────────────────────────────────────────

export const DEXTER_MCP_TOOLS = {
  // Solana Trading (4 tools)
  solana_resolve_token: { schema: SolanaResolveTokenSchema, desc: "Resolve token symbol or address", category: "solana.trading" },
  solana_swap_preview: { schema: SolanaSwapPreviewSchema, desc: "Preview swap output amount", category: "solana.trading" },
  solana_swap_execute: { schema: SolanaSwapExecuteSchema, desc: "Execute token swap on Solana", category: "solana.trading" },
  solana_balance: { schema: SolanaBalanceSchema, desc: "Check SOL or token balance", category: "solana.trading" },

  // x402 Discovery & Payment (6 tools)
  x402_fetch: { schema: X402FetchSchema, desc: "Fetch URL with x402 payment", category: "x402.discovery" },
  x402_jupiter_quote: { schema: X402JupiterQuoteSchema, desc: "Get Jupiter swap quote", category: "x402.discovery" },
  x402_solscan_trending: { schema: X402SolscanTrendingSchema, desc: "Get Solscan trending tokens", category: "x402.discovery" },
  x402_sora_video: { schema: X402SoraVideoSchema, desc: "Generate video via Sora", category: "x402.discovery" },
  x402_gmgn_snapshot: { schema: X402GmgnSnapshotSchema, desc: "Get GMGN token snapshot", category: "x402.discovery" },
  x402_twitter_analysis: { schema: X402TwitterAnalysisSchema, desc: "Analyze Twitter topics", category: "x402.discovery" },

  // Market Data (1 tool)
  markets_fetch_ohlcv: { schema: MarketsFetchOHLCVSchema, desc: "Fetch OHLCV candle data", category: "markets" },

  // Pump.fun Analytics (2 tools)
  pumpstream_search: { schema: PumpstreamSearchSchema, desc: "Search Pump.fun tokens", category: "pumpstream" },
  pumpstream_spotlight: { schema: PumpstreamSpotlightSchema, desc: "Get Pump.fun spotlight tokens", category: "pumpstream" },

  // On-chain Activity (2 tools)
  onchain_activity_overview: { schema: OnchainActivitySchema, desc: "Get wallet activity overview", category: "onchain" },
  onchain_entity_insight: { schema: OnchainEntityInsightSchema, desc: "Get token or wallet insight", category: "onchain" },

  // Wallet Management (2 tools)
  resolve_wallet: { schema: WalletResolveSchema, desc: "Resolve wallet address info", category: "wallet" },
  set_session_wallet_override: { schema: WalletSetOverrideSchema, desc: "Set active wallet session", category: "wallet" },

  // General Web (2 tools)
  search: { schema: GeneralSearchSchema, desc: "Web search via Tavily", category: "general" },
  fetch: { schema: GeneralFetchSchema, desc: "Fetch and parse web page", category: "general" },

  // Hyperliquid Trading (3 tools)
  hyperliquid_markets: { schema: HyperliquidMarketsSchema, desc: "List Hyperliquid perp markets", category: "hyperliquid" },
  hyperliquid_perp_trade: { schema: HyperliquidPerpTradeSchema, desc: "Execute perpetual futures trade", category: "hyperliquid" },
  hyperliquid_opt_in: { schema: HyperliquidOptInSchema, desc: "Opt into Hyperliquid market", category: "hyperliquid" },

  // Stream Shout (1 tool)
  stream_public_shout: { schema: StreamPublicShoutSchema, desc: "Send shout to stream", category: "stream" },
} as const;

export type DexterMCPToolName = keyof typeof DEXTER_MCP_TOOLS;

// Tool categories for UI grouping
export const DEXTER_MCP_CATEGORIES = [
  { id: "solana.trading", label: "Solana Trading", icon: "◎", count: 4 },
  { id: "x402.discovery", label: "x402 Discovery", icon: "💰", count: 6 },
  { id: "markets", label: "Market Data", icon: "📊", count: 1 },
  { id: "pumpstream", label: "Pump.fun", icon: "🎰", count: 2 },
  { id: "onchain", label: "On-chain", icon: "🔗", count: 2 },
  { id: "wallet", label: "Wallet", icon: "👛", count: 2 },
  { id: "general", label: "General", icon: "🌐", count: 2 },
  { id: "hyperliquid", label: "Hyperliquid", icon: "🌊", count: 3 },
  { id: "stream", label: "Stream", icon: "📡", count: 1 },
] as const;
