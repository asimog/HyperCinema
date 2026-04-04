// Poly MCP tool proxy - agents call tools via this endpoint
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPolyMCPClient } from "@/lib/poly-mcp/client";
import { POLY_MCP_TOOLS, PolyMCPToolName } from "@/lib/poly-mcp/types";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

// Request schema for tool calls
const toolCallSchema = z.object({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
});

// GET - list all available Poly MCP tools
export async function GET() {
  const tools = Object.entries(POLY_MCP_TOOLS).map(([name, tool]) => ({
    name,
    description: tool.desc,
  }));

  return NextResponse.json({
    success: true,
    tools,
    total: tools.length,
  });
}

// POST - call a Poly MCP tool
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

    // Validate tool name
    if (!(tool in POLY_MCP_TOOLS)) {
      return NextResponse.json(
        { error: `Unknown tool: ${tool}. Available: ${Object.keys(POLY_MCP_TOOLS).join(", ")}` },
        { status: 400 }
      );
    }

    logger.info("poly_mcp_tool_called", {
      component: "api",
      tool,
      args: JSON.stringify(args).slice(0, 200),
    });

    const client = getPolyMCPClient();
    const result = await client.callTool(tool as PolyMCPToolName, args);

    return NextResponse.json({
      success: !result.isError,
      result: result.content.map((c) => c.text).join("\n"),
      isError: result.isError,
    });
  } catch (error) {
    logger.error("poly_mcp_proxy_failed", {
      component: "api",
      errorCode: "poly_mcp_proxy_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Poly MCP proxy failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
