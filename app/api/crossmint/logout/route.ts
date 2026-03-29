import { getCrossmintAuthHandler } from "@/lib/crossmint/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const auth = getCrossmintAuthHandler();
  if (!auth) {
    return NextResponse.json(
      { error: "Crossmint auth is not configured." },
      { status: 503 },
    );
  }

  const response = await auth.logout(request);
  return response instanceof Response
    ? response
    : NextResponse.json(
        { error: "Crossmint logout returned an unsupported response." },
        { status: 500 },
      );
}
