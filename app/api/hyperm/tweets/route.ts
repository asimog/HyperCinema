import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { fetchXProfileTweets } from "@/lib/x/api";

export const runtime = "nodejs";

const requestSchema = z.object({
  profileInput: z.string().min(2).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await fetchXProfileTweets({
      profileInput: parsed.data.profileInput,
      maxTweets: 42,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("not configured") ||
      message.includes("resolve the X profile") ||
      message.includes("no tweets available")
        ? 503
        : 400;

    return NextResponse.json(
      {
        error: "Failed to load X profile tweets",
        message,
      },
      { status },
    );
  }
}
