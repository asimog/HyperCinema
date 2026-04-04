// Agent helper functions - bridges Dexter MCP and Poly MCP for all agents
import { getDexterMCPClient } from "@/lib/dexter-mcp/client";
import { getPolyMCPClient } from "@/lib/poly-mcp/client";

// ── Dexter MCP DeFi Tools ──────────────────────────────────

export async function agentResolveToken(token: string) {
  const client = getDexterMCPClient();
  return client.resolveToken(token);
}

export async function agentPreviewSwap(input: string, output: string, amount: number) {
  const client = getDexterMCPClient();
  return client.previewSwap(input, output, amount);
}

export async function agentGetJupiterQuote(input: string, output: string, amount: number) {
  const client = getDexterMCPClient();
  return client.getJupiterQuote(input, output, amount);
}

export async function agentCheckBalance(wallet: string) {
  const client = getDexterMCPClient();
  return client.checkBalance(wallet);
}

export async function agentGetTrendingTokens(timeframe?: string) {
  const client = getDexterMCPClient();
  return client.getTrendingTokens(timeframe);
}

export async function agentAnalyzeWallet(wallet: string) {
  const client = getDexterMCPClient();
  return client.analyzeWallet(wallet);
}

export async function agentSearchPumpfun(query: string) {
  const client = getDexterMCPClient();
  return client.searchPumpfun(query);
}

export async function agentWebSearch(query: string) {
  const client = getDexterMCPClient();
  return client.webSearch(query);
}

export async function agentFetchViaDexter(url: string) {
  const client = getDexterMCPClient();
  return client.fetchUrl(url);
}

export async function agentOHLCV(pair: string) {
  const client = getDexterMCPClient();
  return client.getOHLCV(pair);
}

export async function agentHyperliquidTrade(ticker: string, side: "buy" | "sell", size: number) {
  const client = getDexterMCPClient();
  return client.hyperliquidTrade(ticker, side, size);
}

// ── Poly MCP System Tools ──────────────────────────────────

export async function agentReadFile(path: string) {
  const client = getPolyMCPClient();
  return client.callTool("fs_read", { path });
}

export async function agentGitStatus() {
  const client = getPolyMCPClient();
  return client.callTool("git_status", {});
}

export async function agentTimeNow() {
  const client = getPolyMCPClient();
  return client.callTool("time_now", {});
}

export async function agentEstimateCost(prompt: string) {
  const client = getPolyMCPClient();
  return client.callTool("ctx_estimate_cost", { prompt });
}
