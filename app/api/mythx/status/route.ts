import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/mythx/status
 * Check MythX agent status and configuration
 */
export async function GET() {
  try {
    const { getMythXClient } = await import("@/lib/mythx-backend/client");
    const { MYTHX_AGENT_ID } = await import("@/lib/mythx-backend/character");

    const client = getMythXClient();
    const agent = await client.getAgent(MYTHX_AGENT_ID);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get agent status",
        message: error instanceof Error ? error.message : "Unknown error",
        agentStatus: "unavailable",
      },
      { status: 500 }
    );
  }
}
