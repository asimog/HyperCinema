import { NextResponse } from "next/server";

import { getHyperCinemaServiceManifest } from "@/lib/server/hypercinema-service";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    service: getHyperCinemaServiceManifest(),
  });
}
