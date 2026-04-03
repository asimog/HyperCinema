import { dispatchSingleJob } from "@/lib/jobs/dispatch";
import {
  applyConfirmedPayment,
  getJob,
  markPaymentConfirmed,
} from "@/lib/jobs/repository";
import {
  extractMoonpayJobId,
  extractMoonpayWebhookTransactions,
  isMoonpaySuccessfulStatus,
  verifyMoonpayWebhookSignature,
} from "@/lib/payments/moonpay";
import { triggerInstantSweepForJob } from "@/lib/payments/trigger-sweep";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/request-ip";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  return trimmed.slice("bearer ".length).trim() || null;
}

async function readRawBody(request: NextRequest): Promise<string> {
  return request.text();
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    if (!env.MOONPAY_WEBHOOK_SHARED_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "MOONPAY_WEBHOOK_SHARED_TOKEN is not configured" },
        { status: 500 },
      );
    }

    const bearerToken = parseBearerToken(request.headers.get("authorization"));
    const signature = request.headers.get("x-signature")?.trim() ?? "";

    if (bearerToken !== env.MOONPAY_WEBHOOK_SHARED_TOKEN || !signature) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized webhook request" },
        { status: 401 },
      );
    }

    const rawBody = await readRawBody(request);
    if (!verifyMoonpayWebhookSignature(rawBody, signature, env.MOONPAY_WEBHOOK_SHARED_TOKEN)) {
      return NextResponse.json(
        { ok: false, error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      scope: "api_moonpay_webhook_post",
      key: ip,
      rules: [{ name: "webhook_per_minute", windowSec: 60, limit: 60 }],
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rate limit exceeded",
          retryAfterSec: rateLimit.retryAfterSec,
          rule: rateLimit.exceededRule,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
          },
        },
      );
    }

    const parsed = JSON.parse(rawBody) as unknown;
    const transactions = extractMoonpayWebhookTransactions(parsed);

    const results: Array<{
      signature: string | null;
      jobId: string | null;
      status: string | null;
      result:
        | "ignored"
        | "job_not_found"
        | "partial_payment"
        | "duplicate"
        | "confirmed";
      amountLamports?: number;
      dispatch?: "ok" | "retry_scheduled" | "skipped";
      dispatchError?: string;
    }> = [];

    for (const tx of transactions) {
      if (!isMoonpaySuccessfulStatus(tx.transactionStatus)) {
        results.push({
          signature: tx.signature,
          jobId: null,
          status: tx.transactionStatus,
          result: "ignored",
        });
        continue;
      }

      const jobId = extractMoonpayJobId(tx);
      if (!jobId || !tx.signature) {
        results.push({
          signature: tx.signature,
          jobId,
          status: tx.transactionStatus,
          result: "ignored",
        });
        continue;
      }

      const job = await getJob(jobId);
      if (!job) {
        results.push({
          signature: tx.signature,
          jobId,
          status: tx.transactionStatus,
          result: "job_not_found",
        });
        continue;
      }

      if (job.status === "complete" || job.status === "failed" || job.status === "processing") {
        results.push({
          signature: tx.signature,
          jobId,
          status: tx.transactionStatus,
          result: "duplicate",
        });
        continue;
      }

      if (typeof tx.amountLamports === "number" && tx.amountLamports > 0) {
        const payment = await applyConfirmedPayment({
          jobId,
          signature: tx.signature,
          lamports: tx.amountLamports,
        });

        if (!payment.job) {
          results.push({
            signature: tx.signature,
            jobId,
            status: tx.transactionStatus,
            result: "job_not_found",
          });
          continue;
        }

        if (payment.duplicate) {
          results.push({
            signature: tx.signature,
            jobId,
            status: tx.transactionStatus,
            result: "duplicate",
            amountLamports: tx.amountLamports,
          });
          continue;
        }

        void triggerInstantSweepForJob(jobId).catch(() => {
          // Already logged downstream.
        });

        let dispatch: "ok" | "retry_scheduled" | "skipped" | undefined;
        let dispatchError: string | undefined;
        if (payment.newlyConfirmed) {
          const dispatchResult = await dispatchSingleJob(jobId);
          if (dispatchResult.status === "dispatched") {
            dispatch = "ok";
          } else if (dispatchResult.status === "retry_scheduled") {
            dispatch = "retry_scheduled";
            dispatchError = dispatchResult.error;
          } else {
            dispatch = "skipped";
          }
        }

        results.push({
          signature: tx.signature,
          jobId,
          status: tx.transactionStatus,
          result: "confirmed",
          amountLamports: tx.amountLamports,
          dispatch,
          dispatchError,
        });
        continue;
      }

      await markPaymentConfirmed(jobId, tx.signature);
      void triggerInstantSweepForJob(jobId).catch(() => {
        // Already logged downstream.
      });

      const dispatchResult = await dispatchSingleJob(jobId);
      results.push({
        signature: tx.signature,
        jobId,
        status: tx.transactionStatus,
        result: "confirmed",
        dispatch:
          dispatchResult.status === "dispatched"
            ? "ok"
            : dispatchResult.status === "retry_scheduled"
              ? "retry_scheduled"
              : "skipped",
        dispatchError:
          dispatchResult.status === "retry_scheduled" ? dispatchResult.error : undefined,
      });
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    logger.error("moonpay_webhook_failed", {
      component: "api_moonpay_webhook",
      errorCode: "moonpay_webhook_failed",
      errorMessage: message,
    });

    return NextResponse.json(
      { ok: false, error: "Failed to process MoonPay webhook", message },
      { status: 500 },
    );
  }
}
