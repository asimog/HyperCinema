import { getCrossmintViewerFromCookies, isCrossmintAdmin } from "@/lib/crossmint/server";
import { updateJobModeration } from "@/lib/jobs/repository";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const moderationSchema = z.object({
  jobId: z.string().min(1),
  moderationStatus: z.enum(["visible", "flagged", "hidden"]),
});

export async function POST(request: NextRequest) {
  const viewer = await getCrossmintViewerFromCookies();
  if (!viewer || !isCrossmintAdmin({ email: viewer.email, userId: viewer.userId })) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  await updateJobModeration(parsed.data.jobId, parsed.data.moderationStatus);
  return NextResponse.json({ ok: true });
}

