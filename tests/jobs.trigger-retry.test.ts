import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  fetchWithTimeout: vi.fn(),
  retryFailedJob: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@/lib/network/http", () => ({
  fetchWithTimeout: mocks.fetchWithTimeout,
}));

vi.mock("@/lib/jobs/retry", () => ({
  retryFailedJob: mocks.retryFailedJob,
}));

vi.mock("@/lib/network/retry", () => {
  class RetryableError extends Error {}

  return {
    RetryableError,
    isRetryableHttpStatus: (status: number) => status >= 500,
    withRetry: async <T>(fn: () => Promise<T>) => fn(),
  };
});

import { triggerFailedJobRetry } from "@/lib/jobs/trigger-retry";

describe("triggerFailedJobRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to local retry flow when worker /retry-job returns 404", async () => {
    mocks.getEnv.mockReturnValue({
      WORKER_URL: "https://worker.example.com",
      WORKER_TOKEN: "secret",
    });
    mocks.fetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 404,
    });
    mocks.retryFailedJob.mockResolvedValue({
      jobId: "job-1",
      status: "dispatched",
    });

    const result = await triggerFailedJobRetry("job-1");

    expect(mocks.retryFailedJob).toHaveBeenCalledWith("job-1");
    expect(result).toEqual({ jobId: "job-1", status: "dispatched" });
  });
});

