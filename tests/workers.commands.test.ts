import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  retryFailedJob: vi.fn(),
  publishCompletedJobToMoltBook: vi.fn(),
  syncGalleryToMoltBook: vi.fn(),
}));

vi.mock("@/lib/jobs/retry", () => ({
  retryFailedJob: mocks.retryFailedJob,
}));

vi.mock("@/lib/social/moltbook-publisher", () => ({
  publishCompletedJobToMoltBook: mocks.publishCompletedJobToMoltBook,
  syncGalleryToMoltBook: mocks.syncGalleryToMoltBook,
}));

import {
  executeMoltBookSyncCommand,
  executeRetryFailedJobCommand,
} from "@/workers/commands";

describe("worker retry command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when jobId is missing", async () => {
    await expect(executeRetryFailedJobCommand({})).rejects.toThrow(
      "Missing jobId",
    );
  });

  it("calls retryFailedJob with trimmed jobId", async () => {
    mocks.retryFailedJob.mockResolvedValue({ status: "retried" });

    const result = await executeRetryFailedJobCommand({ jobId: " job-123 " });

    expect(mocks.retryFailedJob).toHaveBeenCalledWith("job-123");
    expect(result).toEqual({ status: "retried" });
  });
});

describe("worker moltbook sync command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses single-job publish mode when payload includes jobId", async () => {
    mocks.publishCompletedJobToMoltBook.mockResolvedValue({
      jobId: "job-1",
      status: "posted",
      postId: "post-1",
      postUrl: "https://moltbook.com/post-1",
    });

    const result = await executeMoltBookSyncCommand({ jobId: "job-1" });

    expect(mocks.publishCompletedJobToMoltBook).toHaveBeenCalledWith("job-1");
    expect(result.scanned).toBe(1);
    expect(result.posted).toBe(1);
  });

  it("uses gallery sync when no jobId provided", async () => {
    mocks.syncGalleryToMoltBook.mockResolvedValue({
      scanned: 5,
      posted: 3,
      skipped: 1,
      failed: 1,
      results: [],
    });

    const result = await executeMoltBookSyncCommand({ limit: 5 });

    expect(mocks.syncGalleryToMoltBook).toHaveBeenCalledWith(5);
    expect(result.scanned).toBe(5);
  });
});
