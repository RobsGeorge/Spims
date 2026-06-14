import { describe, it, expect, vi, beforeEach } from "vitest";

describe("storage", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("isStorageConfigured returns false without env vars", async () => {
    const { isStorageConfigured } = await import("@/lib/storage");
    expect(isStorageConfigured()).toBe(false);
  });

  it("createPresignedUploadUrl returns null when not configured", async () => {
    const { createPresignedUploadUrl } = await import("@/lib/storage");
    const result = await createPresignedUploadUrl({
      keyPrefix: "offerings/test",
      filename: "doc.pdf",
      contentType: "application/pdf",
    });
    expect(result).toBeNull();
  });

  it("isStorageConfigured returns true when all vars set", async () => {
    vi.stubEnv("STORAGE_ENDPOINT", "https://r2.example.com");
    vi.stubEnv("STORAGE_BUCKET", "spims");
    vi.stubEnv("STORAGE_KEY", "key");
    vi.stubEnv("STORAGE_SECRET", "secret");
    vi.resetModules();
    const { isStorageConfigured } = await import("@/lib/storage");
    expect(isStorageConfigured()).toBe(true);
  });
});
