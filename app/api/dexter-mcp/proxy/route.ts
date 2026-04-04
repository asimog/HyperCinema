// Dexter MCP proxy - agents call DeFi tools via this endpoint
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDexterMCPClient } from "@/lib/dexter-mcp/client";
import { DEXTER_MCP_TOOLS, DexterMCPToolName, DEXTER_MCP_CATEGORIES } from "@/lib/dexter-mcp/types";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

// Tool call request schema
const toolCallSchema = z.object({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
});

// GET - list all available Dexter MCP tools
export async function GET() {
  const tools = Object.entries(DEXTER_MCP_TOOLS).map(([name, tool]) => ({
    name,
    description: tool.desc,
    category: tool.category,
  }));

  return NextResponse.json({
    success: true,
    tools,
    categories: DEXTER_MCP_CATEGORIES,
    total: tools.length,
  });
}

// POST - call a Dexter MCP tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = toolCallSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tool, args } = validation.data;

    // Validate tool exists
    if (!(tool in DEXTER_MCP_TOOLS)) {
      return NextResponse.json(
        { error: `Unknown tool: ${tool}`, available: Object.keys(DEXTER_MCP_TOOLS) },
        { status: 400 }
      );
    }

    logger.info("dexter_mcp_tool_called", {
      component: "api",
      tool,
      args: JSON.stringify(args).slice(0, 200),
    });

    const client = getDexterMCPClient();
    const result = await client.callTool(tool as DexterMCPToolName, args);

    return NextResponse.json({
      success: !result.isError,
      result: result.content.map((c) => c.text).join("\n"),
      isError: result.isError,
    });
  } catch (error) {
    logger.error("dexter_mcp_proxy_failed", {
      component: "api",
      errorCode: "dexter_mcp_proxy_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Dexter MCP proxy failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
