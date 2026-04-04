// Dexter MCP client - 60+ Solana DeFi tools
import { getDexterMCPConfig } from "./config";
import { DEXTER_MCP_TOOLS, DexterMCPToolName } from "./types";
import { dexterMCPConfigSchema } from "./config";

export interface DexterMCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface DexterMCPServerInfo {
  name: string;
  version: string;
  toolsets: string[];
  access: string;
}

// Dexter MCP HTTP client
export class DexterMCPClient {
  private config: ReturnType<typeof dexterMCPConfigSchema.parse>;

  constructor() {
    this.config = getDexterMCPConfig();
  }

  // Get server info and toolset status
  async getServerInfo(): Promise<DexterMCPServerInfo> {
    const url = this.config.url.replace("/mcp", "/mcp/health");
    const response = await fetch(url, {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Dexter MCP health check failed: ${response.status}`);
    }

    return response.json() as Promise<DexterMCPServerInfo>;
  }

  // Call any Dexter MCP tool
  async callTool(
    toolName: DexterMCPToolName,
    args: Record<string, unknown>,
  ): Promise<DexterMCPToolResult> {
    const tool = DEXTER_MCP_TOOLS[toolName];
    if (!tool) {
      throw new Error(`Unknown Dexter MCP tool: ${toolName}`);
    }

    // Validate args
    const parseResult = tool.schema.safeParse(args);
    if (!parseResult.success) {
      return {
        content: [{ type: "text", text: `Invalid args: ${parseResult.error.message}` }],
        isError: true,
      };
    }

    // Build MCP tool call body
    const body = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: parseResult.data,
      },
    };

    return this.makeRequest(body);
  }

  // Resolve token symbol or address
  async resolveToken(token: string): Promise<DexterMCPToolResult> {
    return this.callTool("solana_resolve_token", { token });
  }

  // Preview swap output
  async previewSwap(inputToken: string, outputToken: string, amount: number): Promise<DexterMCPToolResult> {
    return this.callTool("solana_swap_preview", { inputToken, outputToken, amount });
  }

  // Execute token swap
  async executeSwap(inputToken: string, outputToken: string, amount: number): Promise<DexterMCPToolResult> {
    return this.callTool("solana_swap_execute", { inputToken, outputToken, amount });
  }

  // Check balance
  async checkBalance(wallet: string, token?: string): Promise<DexterMCPToolResult> {
    return this.callTool("solana_balance", { wallet, token });
  }

  // Get Jupiter quote
  async getJupiterQuote(inputMint: string, outputMint: string, amount: number): Promise<DexterMCPToolResult> {
    return this.callTool("x402_jupiter_quote", { inputMint, outputMint, amount });
  }

  // Get trending tokens
  async getTrendingTokens(timeframe: string = "24h"): Promise<DexterMCPToolResult> {
    return this.callTool("x402_solscan_trending", { timeframe });
  }

  // Fetch OHLCV data
  async getOHLCV(pair: string, timeframe: string = "1h", limit: number = 100): Promise<DexterMCPToolResult> {
    return this.callTool("markets_fetch_ohlcv", { pair, timeframe, limit });
  }

  // Analyze wallet activity
  async analyzeWallet(wallet: string, timeframe: string = "7d"): Promise<DexterMCPToolResult> {
    return this.callTool("onchain_activity_overview", { wallet, timeframe });
  }

  // Search Pump.fun
  async searchPumpfun(query: string): Promise<DexterMCPToolResult> {
    return this.callTool("pumpstream_search", { query });
  }

  // Web search
  async webSearch(query: string): Promise<DexterMCPToolResult> {
    return this.callTool("search", { query });
  }

  // Execute Hyperliquid trade
  async hyperliquidTrade(ticker: string, side: "buy" | "sell", size: number): Promise<DexterMCPToolResult> {
    return this.callTool("hyperliquid_perp_trade", { ticker, side, size });
  }

  // Make HTTP request with retry logic
  private async makeRequest(
    body: unknown,
    attempt: number = 0,
  ): Promise<DexterMCPToolResult> {
    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [{ type: "text", text: `Dexter MCP error: ${errorText}` }],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: data.result?.content || [{ type: "text", text: JSON.stringify(data) }],
        isError: data.error !== undefined,
      };
    } catch (error) {
      // Retry if configured
      if (this.config.retry && attempt < this.config.maxRetries) {
        await this.sleep(1000 * (attempt + 1));
        return this.makeRequest(body, attempt + 1);
      }

      return {
        content: [{ type: "text", text: `Dexter MCP request failed: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }

  // Build auth headers
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }

    return headers;
  }

  // Sleep helper
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get available tool names
  getAvailableTools(): DexterMCPToolName[] {
    return Object.keys(DEXTER_MCP_TOOLS) as DexterMCPToolName[];
  }

  // Get tool description
  getToolDescription(toolName: DexterMCPToolName): string {
    return DEXTER_MCP_TOOLS[toolName]?.desc || "Unknown tool";
  }

  // Get tool category
  getToolCategory(toolName: DexterMCPToolName): string {
    return DEXTER_MCP_TOOLS[toolName]?.category || "unknown";
  }
}

// Global singleton
let dexterMCPClientInstance: DexterMCPClient | null = null;

// Get or create client
export function getDexterMCPClient(): DexterMCPClient {
  if (!dexterMCPClientInstance) {
    dexterMCPClientInstance = new DexterMCPClient();
  }
  return dexterMCPClientInstance;
}
