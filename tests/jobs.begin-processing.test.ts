import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, Record<string, unknown>>();

const fakeDb = {
  collection: (name: string) => ({
    doc: (id: string) => ({ id: `${name}/${id}` }),
  }),
  runTransaction: async <T>(
    fn: (tx: {
      get: (
        ref: { id: string },
      ) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
      set: (
        ref: { id: string },
        value: Record<string, unknown>,
        options?: { merge?: boolean },
      ) => void;
    }) => Promise<T>,
  ) => {
    const tx = {
      get: async (ref: { id: string }) => ({
        exists: store.has(ref.id),
        data: () => store.get(ref.id),
      }),
      set: (
        ref: { id: string },
        value: Record<string, unknown>,
        options?: { merge?: boolean },
      ) => {
        if (options?.merge && store.has(ref.id)) {
          store.set(ref.id, { ...store.get(ref.id), ...value });
          return;
        }
        store.set(ref.id, value);
      },
    };

    return fn(tx);
  },
};

vi.mock("@/lib/firebase/admin", () => ({
  getDb: () => fakeDb,
}));

import { beginJobProcessing } from "@/lib/jobs/repository";

function seedPaymentConfirmedJob(jobId: string) {
  const now = new Date().toISOString();
  store.set(`jobs/${jobId}`, {
    jobId,
    wallet: "11111111111111111111111111111111",
    packageType: "1d",
    rangeDays: 1,
    priceSol: 0.02,
    videoSeconds: 30,
    status: "payment_confirmed",
    progress: "payment_confirmed",
    txSignature: "sig-1",
    createdAt: now,
    updatedAt: now,
    errorCode: null,
    errorMessage: null,
    paymentAddress: "11111111111111111111111111111111",
    paymentIndex: 1,
    paymentRouting: "dedicated_address",
    requiredLamports: 20_000_000,
    receivedLamports: 20_000_000,
    paymentSignatures: ["sig-1"],
    lastPaymentAt: now,
    sweepStatus: "pending",
    sweepSignature: null,
    sweptLamports: 0,
    lastSweepAt: null,
    sweepError: null,
  });
}

describe("beginJobProcessing", () => {
  beforeEach(() => {
    store.clear();
  });

  it("acquires processing exactly once for payment-confirmed jobs", async () => {
    seedPaymentConfirmedJob("job-1");

    const first = await beginJobProcessing("job-1");
    const second = await beginJobProcessing("job-1");

    expect(first.acquired).toBe(true);
    expect(first.job?.status).toBe("processing");
    expect(second.acquired).toBe(false);
    expect(second.job?.status).toBe("processing");
  });

  it("reacquires stale processing jobs", async () => {
    seedPaymentConfirmedJob("job-stale");
    store.set(`jobs/job-stale`, {
      ...store.get("jobs/job-stale"),
      status: "processing",
      progress: "generating_video",
      updatedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    });

    const result = await beginJobProcessing("job-stale", {
      staleAfterMs: 60_000,
    });

    expect(result.acquired).toBe(true);
    expect(result.job?.status).toBe("processing");
    expect(result.job?.progress).toBe("generating_video");
  });

  it("does not reacquire fresh processing jobs", async () => {
    seedPaymentConfirmedJob("job-fresh");
    store.set(`jobs/job-fresh`, {
      ...store.get("jobs/job-fresh"),
      status: "processing",
      progress: "generating_video",
      updatedAt: new Date().toISOString(),
    });

    const result = await beginJobProcessing("job-fresh", {
      staleAfterMs: 60_000,
    });

    expect(result.acquired).toBe(false);
    expect(result.job?.status).toBe("processing");
  });
});
