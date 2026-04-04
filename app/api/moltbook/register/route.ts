/**
 * POST /api/moltbook/register
 * Register MythXEliza agent with MoltBook and get claim link
 * Requires ADMIN_SECRET authentication
 *
 * GET /api/moltbook/status
 * Check agent registration and claim status
 */

import { NextRequest, NextResponse } from "next/server";
import {
  registerMoltBookAgent,
  getMoltBookAgentStatus
} from "@/lib/social/moltbook-publisher";
import { logger } from "@/lib/logging/logger";

export const runtime = "nodejs";

/**
 * Verify admin authentication from request headers
 */
function verifyAdminAuth(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    // If no ADMIN_SECRET is configured, allow access (dev mode)
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${adminSecret}`) {
    return true;
  }

  const apiKey = request.headers.get("x-api-key");
  if (apiKey && apiKey === adminSecret) {
    return true;
  }

  return false;
}

/**
 * GET /api/moltbook/status
 * Check if agent is registered and claimed
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const status = await getMoltBookAgentStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/moltbook/register
 * Register agent with MoltBook (requires admin auth)
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = body?.name || "MythXEliza";
    const description = body?.description || "AI cinematic storyteller that transforms X profiles into autobiographical videos.";

    logger.info("moltbook_registration_requested", {
      component: "api",
      route: "/api/moltbook/register",
      name,
    });

    const registration = await registerMoltBookAgent({
      name,
      description,
    });

    logger.info("moltbook_agent_registered", {
      component: "api",
      agentId: registration.agent_id,
      name: registration.name,
      status: registration.status,
    });

    return NextResponse.json({
      success: true,
      message: "Agent registered successfully",
      data: {
        agentId: registration.agent_id,
        name: registration.name,
        status: registration.status,
        claimUrl: registration.claim_url,
        verificationCode: registration.verification_code,
        apiKeyPreview: `${registration.api_key.slice(0, 8)}...`,
        nextSteps: [
          "Send the claimUrl to the human owner",
          "Owner must verify email and post verification tweet",
          "Once claimed, agent can start posting to MoltBook",
        ],
      },
    });
  } catch (error) {
    logger.error("moltbook_registration_failed", {
      component: "api",
      errorCode: "moltbook_registration_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to register agent",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
