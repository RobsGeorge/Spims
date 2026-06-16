import { describe, it, expect } from "vitest";
import { buildSecurityHeaders } from "@/lib/security/headers";

describe("buildSecurityHeaders", () => {
  it("includes baseline headers in development", () => {
    const keys = buildSecurityHeaders(false).map((h) => h.key);
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).not.toContain("Strict-Transport-Security");
  });

  it("adds HSTS in production", () => {
    const keys = buildSecurityHeaders(true).map((h) => h.key);
    expect(keys).toContain("Strict-Transport-Security");
  });
});
