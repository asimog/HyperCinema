// Poly MCP client - connects to 73 tools across 11 modules
import { getPolyMCPConfig } from "./config";
import { POLY_MCP_TOOLS, PolyMCPToolName } from "./types";
import { polyMCPConfigSchema } from "./config";

export interface PolyMCPToolCall {
  toolName: PolyMCPToolName;
  arguments: Record<string, unknown>;
}

export interface PolyMCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface PolyMCPServerInfo {
  name: string;
  version: string;
  tools: number;
}

// Poly MCP HTTP client class
export class PolyMCPClient {
  private config: ReturnType<typeof polyMCPConfigSchema.parse>;

  constructor() {
    this.config = getPolyMCPConfig();
  }

  // Get server info including tool count
  async getServerInfo(): Promise<PolyMCPServerInfo> {
    const response = await fetch(this.config.url.replace("/mcp", "/info"), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Poly MCP server info failed: ${response.status}`);
    }

    return response.json() as Promise<PolyMCPServerInfo>;
  }

  // Call any of the 73 Poly MCP tools
  async callTool(
    toolName: PolyMCPToolName,
    args: Record<string, unknown>,
  ): Promise<PolyMCPToolResult> {
    const tool = POLY_MCP_TOOLS[toolName];
    if (!tool) {
      throw new Error(`Unknown Poly MCP tool: ${toolName}`);
    }

    // Validate args against schema
    const parseResult = tool.schema.safeParse(args);
    if (!parseResult.success) {
      return {
        content: [{ type: "text", text: `Invalid args: ${parseResult.error.message}` }],
        isError: true,
      };
    }

    // Build request body
    const body = {
      tool: toolName,
      arguments: parseResult.data,
    };

    // Make request with retry logic
    return this.makeRequest(body);
  }

  // Make HTTP request to Poly MCP server
  private async makeRequest(
    body: unknown,
    attempt: number = 0,
  ): Promise<PolyMCPToolResult> {
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
          content: [{ type: "text", text: `Poly MCP error: ${errorText}` }],
          isError: true,
        };
      }

      return response.json() as Promise<PolyMCPToolResult>;
    } catch (error) {
      // Retry if configured and attempts remain
      if (this.config.retry && attempt < this.config.maxRetries) {
        await this.sleep(1000 * (attempt + 1));
        return this.makeRequest(body, attempt + 1);
      }

      return {
        content: [{ type: "text", text: `Poly MCP request failed: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  }

  // Build auth headers
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  // Sleep helper for retries
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get list of all available tools
  getAvailableTools(): PolyMCPToolName[] {
    return Object.keys(POLY_MCP_TOOLS) as PolyMCPToolName[];
  }

  // Get tool description
  getToolDescription(toolName: PolyMCPToolName): string {
    return POLY_MCP_TOOLS[toolName]?.desc || "Unknown tool";
  }
}

// Global singleton for reuse
let polyMCPClientInstance: PolyMCPClient | null = null;

// Get or create Poly MCP client instance
export function getPolyMCPClient(): PolyMCPClient {
  if (!polyMCPClientInstance) {
    polyMCPClientInstance = new PolyMCPClient();
  }
  return polyMCPClientInstance;
}
