import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildSweepSummary: vi.fn(),
  sweepDedicatedPaymentAddressForJob: vi.fn(),
  sweepDedicatedPaymentAddresses: vi.fn(),
  retryFailedJob: vi.fn(),
  publishCompletedJobToGoonBook: vi.fn(),
  syncGalleryToGoonBook: vi.fn(),
}));

vi.mock("@/workers/sweep-payments", () => ({
  buildSweepSummary: mocks.buildSweepSummary,
  sweepDedicatedPaymentAddressForJob: mocks.sweepDedicatedPaymentAddressForJob,
  sweepDedicatedPaymentAddresses: mocks.sweepDedicatedPaymentAddresses,
}));

vi.mock("@/lib/jobs/retry", () => ({
  retryFailedJob: mocks.retryFailedJob,
}));

vi.mock("@/lib/social/goonbook-publisher", () => ({
  publishCompletedJobToGoonBook: mocks.publishCompletedJobToGoonBook,
  syncGalleryToGoonBook: mocks.syncGalleryToGoonBook,
}));

import {
  executeGoonBookSyncCommand,
  executeRetryFailedJobCommand,
  executeSweepCommand,
} from "@/workers/commands";

describe("worker sweep command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses single-job sweep mode when payload includes jobId", async () => {
    const singleResult = { jobId: "job-1", status: "swept" };
    const summary = {
      scanned: 1,
      swept: 1,
      pending: 0,
      failed: 0,
      results: [singleResult],
    };

    mocks.sweepDedicatedPaymentAddressForJob.mockResolvedValue(singleResult);
    mocks.buildSweepSummary.mockReturnValue(summary);

    const result = await executeSweepCommand({ jobId: "job-1", limit: 10 });

    expect(mocks.sweepDedicatedPaymentAddressForJob).toHaveBeenCalledWith("job-1");
    expect(mocks.buildSweepSummary).toHaveBeenCalledWith(1, [singleResult]);
    expect(mocks.sweepDedicatedPaymentAddresses).not.toHaveBeenCalled();
    expect(result).toEqual(summary);
  });

  it("uses batch sweep mode when payload does not include jobId", async () => {
    const summary = {
      scanned: 5,
      swept: 3,
      pending: 2,
      failed: 0,
      results: [],
    };
    mocks.sweepDedicatedPaymentAddresses.mockResolvedValue(summary);

    const result = await executeSweepCommand({ limit: 25 });

    expect(mocks.sweepDedicatedPaymentAddresses).toHaveBeenCalledWith(25);
    expect(mocks.sweepDedicatedPaymentAddressForJob).not.toHaveBeenCalled();
    expect(result).toEqual(summary);
  });
});

describe("worker retry command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries a specific failed job when payload contains jobId", async () => {
    const retryResult = { jobId: "job-failed", status: "dispatched" };
    mocks.retryFailedJob.mockResolvedValue(retryResult);

    const result = await executeRetryFailedJobCommand({ jobId: " job-failed " });

    expect(mocks.retryFailedJob).toHaveBeenCalledWith("job-failed");
    expect(result).toEqual(retryResult);
  });

  it("throws when payload has no jobId", async () => {
    await expect(executeRetryFailedJobCommand({})).rejects.toThrow("Missing jobId");
    expect(mocks.retryFailedJob).not.toHaveBeenCalled();
  });
});

describe("worker GoonBook sync command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a specific completed job when payload includes jobId", async () => {
    mocks.publishCompletedJobToGoonBook.mockResolvedValue({
      jobId: "job-complete",
      status: "posted",
      postId: "goonbook-post-1",
    });

    const result = await executeGoonBookSyncCommand({ jobId: " job-complete " });

    expect(mocks.publishCompletedJobToGoonBook).toHaveBeenCalledWith("job-complete");
    expect(mocks.syncGalleryToGoonBook).not.toHaveBeenCalled();
    expect(result).toEqual({
      scanned: 1,
      posted: 1,
      skipped: 0,
      failed: 0,
      results: [
        {
          jobId: "job-complete",
          status: "posted",
          postId: "goonbook-post-1",
        },
      ],
    });
  });

  it("falls back to gallery sync mode when no jobId is provided", async () => {
    const summary = {
      scanned: 4,
      posted: 2,
      skipped: 1,
      failed: 1,
      results: [],
    };
    mocks.syncGalleryToGoonBook.mockResolvedValue(summary);

    const result = await executeGoonBookSyncCommand({ limit: 8 });

    expect(mocks.syncGalleryToGoonBook).toHaveBeenCalledWith(8);
    expect(result).toEqual(summary);
  });
});
