import { cockpitSessionCookie } from "@/lib/admin/cockpit-auth";
import {
  deleteAllDiscountCodes,
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

function isAuthed(request: NextRequest): boolean {
  return request.cookies.get(cockpitSessionCookie.name)?.value === cockpitSessionCookie.value;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const records = await listDiscountCodeAdminRecords();
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
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
      issuedBy: "cockpit",
    });

    return NextResponse.json({ ok: true, code: record.code, record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue discount code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const result = await deleteAllDiscountCodes();
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete discount codes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
