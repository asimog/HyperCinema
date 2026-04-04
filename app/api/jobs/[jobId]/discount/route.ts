import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import { applyDiscountCodeToJob } from "@/lib/jobs/repository";
import { normalizeDiscountCode } from "@/lib/payments/discount-codes";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const redeemSchema = z.object({
  discountCode: z.string().min(2).max(32),
});

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { jobId } = await context.params;
    const body = await request.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const discountCode = normalizeDiscountCode(parsed.data.discountCode);
    const job = await applyDiscountCodeToJob({ jobId, discountCode });
    await dispatchSingleJob(jobId);

    return NextResponse.json({
      ok: true,
      paymentRequired: false,
      discountCode: job.discountCode ?? discountCode,
      job,
      message: "Discount code accepted. Your job is now live.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to apply discount code",
        message,
      },
      { status: 400 },
    );
  }
}
