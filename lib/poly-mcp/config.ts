// Poly MCP configuration
import { z } from "zod";

export const polyMCPConfigSchema = z.object({
  // Poly MCP server URL
  url: z.string().url().default("http://localhost:8000/mcp"),
  // Transport type: stdio or http
  transport: z.enum(["stdio", "http"]).default("http"),
  // API key for authenticated servers
  apiKey: z.string().optional(),
  // Timeout for tool calls in ms
  timeout: z.number().int().positive().default(30000),
  // Auto-retry failed calls
  retry: z.boolean().default(false),
  // Max retries
  maxRetries: z.number().int().nonnegative().default(3),
});

export type PolyMCPConfig = z.infer<typeof polyMCPConfigSchema>;

// Get config from environment
export function getPolyMCPConfig(): PolyMCPConfig {
  return polyMCPConfigSchema.parse({
    url: process.env.POLY_MCP_URL || "http://localhost:8000/mcp",
    transport: process.env.POLY_MCP_TRANSPORT || "http",
    apiKey: process.env.POLY_MCP_API_KEY,
    timeout: parseInt(process.env.POLY_MCP_TIMEOUT || "30000", 10),
    retry: process.env.POLY_MCP_RETRY === "true",
    maxRetries: parseInt(process.env.POLY_MCP_MAX_RETRIES || "3", 10),
  });
}
