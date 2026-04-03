import { getCrossmintViewerFromCookies, isCrossmintAdmin } from "@/lib/crossmint/server";
import {
  issueDiscountCode,
  listDiscountCodeAdminRecords,
} from "@/lib/jobs/repository";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const createSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  label: z.string().max(120).optional(),
});

async function ensureAdminAccess() {
  const viewer = await getCrossmintViewerFromCookies();
  if (!viewer || !isCrossmintAdmin({ email: viewer.email, userId: viewer.userId })) {
    return null;
  }

  return viewer;
}

export async function GET() {
  const viewer = await ensureAdminAccess();
  if (!viewer) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const records = await listDiscountCodeAdminRecords();
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const viewer = await ensureAdminAccess();
  if (!viewer) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const record = await issueDiscountCode({
      code: parsed.data.code,
      label: parsed.data.label,
      issuedBy: viewer.userId,
    });

    return NextResponse.json({ ok: true, code: record.code, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue discount code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
