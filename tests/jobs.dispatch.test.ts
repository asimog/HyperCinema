import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimDispatchJob: vi.fn(),
  claimDueDispatchJobs: vi.fn(),
  markDispatchJobSuccess: vi.fn(),
  rescheduleDispatchJob: vi.fn(),
  triggerJobProcessing: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    JOB_DISPATCH_BATCH_LIMIT: 10,
  }),
}));

vi.mock("@/lib/jobs/repository", () => ({
  claimDispatchJob: mocks.claimDispatchJob,
  claimDueDispatchJobs: mocks.claimDueDispatchJobs,
  markDispatchJobSuccess: mocks.markDispatchJobSuccess,
  rescheduleDispatchJob: mocks.rescheduleDispatchJob,
}));

vi.mock("@/lib/jobs/trigger", () => ({
  triggerJobProcessing: mocks.triggerJobProcessing,
}));

import { dispatchDueJobs, dispatchSingleJob } from "@/lib/jobs/dispatch";

describe("job dispatch outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules retry when dispatch fails", async () => {
    mocks.claimDispatchJob.mockResolvedValue({ jobId: "job-1" });
    mocks.triggerJobProcessing.mockRejectedValue(new Error("worker down"));

    const result = await dispatchSingleJob("job-1");

    expect(result.status).toBe("retry_scheduled");
    expect(mocks.rescheduleDispatchJob).toHaveBeenCalledWith(
      "job-1",
      "worker down",
    );
    expect(mocks.markDispatchJobSuccess).not.toHaveBeenCalled();
  });

  it("marks dispatch success when worker accepts", async () => {
    mocks.claimDispatchJob.mockResolvedValue({ jobId: "job-2" });
    mocks.triggerJobProcessing.mockResolvedValue(undefined);

    const result = await dispatchSingleJob("job-2");

    expect(result.status).toBe("dispatched");
    expect(mocks.markDispatchJobSuccess).toHaveBeenCalledWith("job-2");
    expect(mocks.rescheduleDispatchJob).not.toHaveBeenCalled();
  });

  it("processes claimed due jobs in batch mode", async () => {
    mocks.claimDueDispatchJobs.mockResolvedValue([
      { jobId: "job-a" },
      { jobId: "job-b" },
    ]);
    mocks.triggerJobProcessing.mockResolvedValue(undefined);

    const summary = await dispatchDueJobs(2);

    expect(summary.processed).toBe(2);
    expect(summary.dispatched).toBe(2);
    expect(mocks.markDispatchJobSuccess).toHaveBeenCalledTimes(2);
  });
});
