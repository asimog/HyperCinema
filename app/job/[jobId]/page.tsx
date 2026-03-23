"use client";

import { PaymentInstructionsCard } from "@/components/PaymentInstructionsCard";
import { ReportCard } from "@/components/ReportCard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { FINAL_JOB_STATUSES } from "@/lib/constants";
import type { PaymentInstructions } from "@/lib/payments/instructions";
import { JobDocument, ReportDocument, VideoDocument } from "@/lib/types/domain";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface JobApiPayload {
  job?: JobDocument;
  report?: ReportDocument | null;
  video?: VideoDocument | null;
  payment?: PaymentInstructions | null;
  error?: string;
  message?: string;
  warning?: string;
}

function statusLabel(status: JobDocument["status"], progress: JobDocument["progress"]) {
  if (status === "awaiting_payment") return "Waiting on the send";
  if (status === "payment_detected") return "Payment seen on-chain";
  if (status === "payment_confirmed") return "Payment locked";
  if (progress === "generating_report") return "Writing the dossier";
  if (progress === "generating_video") return "Cutting the trailer";
  if (status === "processing") return "In the edit suite";
  if (status === "complete") return "Premiere ready";
  return "Production halted";
}

function nextPollDelay(job: JobDocument | null, elapsedMs: number): number {
  if (elapsedMs >= 2 * 60 * 1000) {
    return 15000;
  }

  if (!job) {
    return 8000;
  }

  if (
    job.status === "awaiting_payment" ||
    job.status === "payment_detected" ||
    job.status === "payment_confirmed"
  ) {
    return 10000;
  }

  if (
    job.progress === "generating_script" ||
    job.progress === "generating_video" ||
    job.progress === "uploading_assets"
  ) {
    return 8000;
  }

  if (job.status === "processing") {
    return 5000;
  }

  return 10000;
}

function priceLabel(job: JobDocument): string {
  if (job.paymentMethod === "x402_usdc") {
    const priceUsdc = job.priceUsdc ?? 0;
    return `$${priceUsdc} USDC`;
  }

  return `${job.priceSol} SOL`;
}

function paymentDescriptor(job: JobDocument): string {
  if (job.paymentMethod === "x402_usdc") {
    return "Paid through x402 on Solana";
  }

  return "Manual dedicated-address checkout";
}

export default function JobPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const [job, setJob] = useState<JobDocument | null>(null);
  const [report, setReport] = useState<ReportDocument | null>(null);
  const [video, setVideo] = useState<VideoDocument | null>(null);
  const [payment, setPayment] = useState<PaymentInstructions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadJob = useCallback(async (): Promise<JobDocument | null> => {
    const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    const payload = (await response.json()) as JobApiPayload;
    if (!response.ok) {
      throw new Error(payload.message ?? payload.error ?? "Failed to fetch job.");
    }
    setJob(payload.job ?? null);
    setReport(payload.report ?? null);
    setVideo(payload.video ?? null);
    setPayment(payload.payment ?? null);
    return payload.job ?? null;
  }, [jobId]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;
    let consecutiveErrors = 0;
    const startedAt = Date.now();

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      timer = setTimeout(() => {
        void tick();
      }, delayMs);
    };

    const tick = async () => {
      if (cancelled) return;

      try {
        const latest = await loadJob();
        consecutiveErrors = 0;
        setError(null);

        if (latest && FINAL_JOB_STATUSES.includes(latest.status)) {
          return;
        }

        const elapsedMs = Date.now() - startedAt;
        schedule(nextPollDelay(latest, elapsedMs));
      } catch (pollError) {
        consecutiveErrors += 1;

        if (consecutiveErrors >= 3) {
          setError(
            pollError instanceof Error
              ? pollError.message
              : "Polling failed after repeated retries.",
          );
          return;
        }

        const elapsedMs = Date.now() - startedAt;
        const backoffDelay = Math.min(15000, 5000 + consecutiveErrors * 2000);
        schedule(Math.max(nextPollDelay(null, elapsedMs), backoffDelay));
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loadJob]);

  const isComplete = job?.status === "complete";
  const hasVideo = Boolean(video?.videoUrl);
  const hasReport = Boolean(report);

  const retryFailedJob = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? payload.error ?? "Failed to retry job.");
      }

      window.location.reload();
    } catch (retryError) {
      setError(
        retryError instanceof Error ? retryError.message : "Failed to retry job.",
      );
    } finally {
      setIsRetrying(false);
    }
  }, [jobId]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const publicUrl = `${window.location.origin}/job/${jobId}`;
    const text = "My memecoin trading history got turned into absolute cinema.";
    return `https://x.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(publicUrl)}`;
  }, [jobId]);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="cinema-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="cinema-kicker text-[0.68rem] font-semibold">Trench Cinema Job</p>
              <h1 className="font-display mt-3 text-4xl leading-none text-[#fff0da] md:text-5xl">
                Production File
              </h1>
              <p className="mt-3 break-all text-sm leading-relaxed text-[var(--muted)]">
                {jobId}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                This page updates automatically while the report is being assembled and the
                trailer is being cut.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[32rem]">
              <div className="cinema-panel-soft rounded-[1.4rem] p-4">
                <p className="cinema-kicker text-[0.62rem] font-semibold">Status</p>
                <p className="mt-2 text-lg font-semibold text-[var(--accent-cool)]">
                  {job ? statusLabel(job.status, job.progress) : "Loading scene"}
                </p>
              </div>
              <div className="cinema-panel-soft rounded-[1.4rem] p-4">
                <p className="cinema-kicker text-[0.62rem] font-semibold">Package</p>
                <p className="mt-2 text-lg font-semibold text-[#fff2df]">
                  {job?.packageType ?? "Pending"}
                </p>
              </div>
            </div>
          </div>

          {job ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="cinema-panel-soft rounded-[1.3rem] p-4">
                <p className="cinema-kicker text-[0.62rem] font-semibold">Wallet</p>
                <p className="mt-2 break-all text-sm text-[#fff1dc]">{job.wallet}</p>
              </div>
              <div className="cinema-panel-soft rounded-[1.3rem] p-4">
                <p className="cinema-kicker text-[0.62rem] font-semibold">Price</p>
                <p className="mt-2 font-display text-3xl text-[#fff1dc]">{priceLabel(job)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{paymentDescriptor(job)}</p>
              </div>
              <div className="cinema-panel-soft rounded-[1.3rem] p-4">
                <p className="cinema-kicker text-[0.62rem] font-semibold">Pipeline</p>
                <p className="mt-2 text-sm text-[#f4dfc4]">{job.progress}</p>
                <p className="mt-1 break-all text-xs text-[var(--muted)]">
                  {job.txSignature ?? "Waiting on transaction signature"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--muted)]">Loading job...</p>
          )}

          {error ? (
            <p className="mt-5 whitespace-pre-wrap break-words rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          {!isComplete && !error ? (
            <p className="mt-5 text-sm text-[var(--muted)]">
              Keep this page open. The page will continue polling while the production run is
              active.
            </p>
          ) : null}

          {job?.status === "failed" ? (
            <div className="mt-5 space-y-3">
              <p className="whitespace-pre-wrap break-words rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {job.errorMessage ?? "The job failed during generation."}
              </p>
              <button
                type="button"
                onClick={retryFailedJob}
                disabled={isRetrying}
                className="cinema-secondary-button inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRetrying ? "Rebuilding production..." : "Retry failed job"}
              </button>
            </div>
          ) : null}
        </section>

        {job &&
        payment &&
        (job.status === "awaiting_payment" ||
          job.status === "payment_detected" ||
          job.status === "payment_confirmed") ? (
          <PaymentInstructionsCard
            amountSol={payment.amountSol}
            paymentAddress={payment.paymentAddress}
            receivedSol={payment.receivedSol}
            remainingSol={payment.remainingSol}
            statusText={statusLabel(job.status, job.progress)}
          />
        ) : null}

        {hasVideo && video ? (
          <section className="cinema-panel rounded-[2rem] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="cinema-kicker text-[0.68rem] font-semibold">Now Screening</p>
                <h2 className="font-display mt-2 text-4xl leading-none text-[#fff1dc]">
                  Cinematic Video
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`/api/video/${jobId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cinema-primary-button inline-flex rounded-2xl px-4 py-3 text-sm font-semibold transition"
                >
                  Download video
                </a>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cinema-secondary-button inline-flex rounded-2xl px-4 py-3 text-sm font-medium transition"
                >
                  Post to X
                </a>
              </div>
            </div>

            <div className="mt-5">
              <VideoPlayer
                src={`/api/video/${jobId}`}
                poster={video.thumbnailUrl ?? undefined}
              />
            </div>
          </section>
        ) : null}

        {hasReport && report ? (
          <ReportCard report={report} reportUrl={`/api/report/${jobId}`} />
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="cinema-secondary-button inline-flex rounded-2xl px-4 py-3 text-sm font-medium transition"
          >
            Create another job
          </Link>
        </div>
      </main>
    </div>
  );
}
