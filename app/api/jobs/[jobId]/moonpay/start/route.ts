import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import { getJob } from "@/lib/jobs/repository";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ jobId: string }>;
};

export async function POST(_: Request, context: Context) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "payment_confirmed" && job.status !== "processing" && job.status !== "complete") {
    return NextResponse.json(
      {
        ok: false,
        error: "Payment is not confirmed yet.",
        status: job.status,
      },
      { status: 409 },
    );
  }

  const dispatch = await dispatchSingleJob(jobId);
  return NextResponse.json({
    ok: true,
    dispatch,
    status: job.status,
  });
}
