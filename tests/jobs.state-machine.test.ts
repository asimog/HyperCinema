import { assertTransition, canTransition } from "@/lib/jobs/state-machine";

describe("job state machine", () => {
  it("allows valid transitions", () => {
    expect(canTransition("pending", "processing")).toBe(true);
    expect(canTransition("pending", "failed")).toBe(true);
    expect(canTransition("processing", "complete")).toBe(true);
    expect(canTransition("processing", "failed")).toBe(true);
    expect(canTransition("failed", "pending")).toBe(true); // retry
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("pending", "complete")).toBe(false);
    expect(canTransition("complete", "processing")).toBe(false);
    expect(canTransition("complete", "pending")).toBe(false);
    expect(() => assertTransition("complete", "processing")).toThrow();
    expect(() => assertTransition("failed", "complete")).toThrow();
  });
});
