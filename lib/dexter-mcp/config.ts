// Dexter MCP configuration
import { z } from "zod";

// Dexter MCP config schema
export const dexterMCPConfigSchema = z.object({
  // Dexter MCP server URL
  url: z.string().url().default("https://mcp.dexter.cash/mcp"),
  // Bearer token for authenticated access
  token: z.string().optional(),
  // Toolsets to load (comma-separated)
  toolsets: z.string().default("solana,x402,markets,pumpstream,onchain,wallet,general,hyperliquid,stream"),
  // Request timeout in ms
  timeout: z.number().int().positive().default(30000),
  // Auto-retry on failure
  retry: z.boolean().default(false),
  // Max retry attempts
  maxRetries: z.number().int().nonnegative().default(3),
});

export type DexterMCPConfig = z.infer<typeof dexterMCPConfigSchema>;

// Get config from environment
export function getDexterMCPConfig(): DexterMCPConfig {
  return dexterMCPConfigSchema.parse({
    url: process.env.DEXTER_MCP_URL || "https://mcp.dexter.cash/mcp",
    token: process.env.DEXTER_MCP_TOKEN,
    toolsets: process.env.DEXTER_MCP_TOOLSETS || "solana,x402,markets,pumpstream,onchain,wallet,general,hyperliquid,stream",
    timeout: parseInt(process.env.DEXTER_MCP_TIMEOUT || "30000", 10),
    retry: process.env.DEXTER_MCP_RETRY === "true",
    maxRetries: parseInt(process.env.DEXTER_MCP_MAX_RETRIES || "3", 10),
  });
}
