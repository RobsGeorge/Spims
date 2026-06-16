import { describe, it, expect } from "vitest";
import { processJob } from "@/lib/jobs/process-job";

describe("processJob", () => {
  it("rejects unknown job names", async () => {
    await expect(processJob("unknown-job", {})).rejects.toThrow("Unknown job");
  });
});
