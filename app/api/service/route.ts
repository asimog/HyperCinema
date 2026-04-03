import { NextResponse } from "next/server";

import { publicHyperCinemaServiceManifest } from "@/lib/service/public-manifest";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    service: publicHyperCinemaServiceManifest,
  });
}
