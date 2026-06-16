import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => resetRateLimits());

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const opts = { windowMs: 60_000, max: 3 };
    expect(checkRateLimit("ip-1", opts).allowed).toBe(true);
    expect(checkRateLimit("ip-1", opts).allowed).toBe(true);
    expect(checkRateLimit("ip-1", opts).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const opts = { windowMs: 60_000, max: 2 };
    checkRateLimit("ip-2", opts);
    checkRateLimit("ip-2", opts);
    const blocked = checkRateLimit("ip-2", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const opts = { windowMs: 60_000, max: 1 };
    checkRateLimit("a", opts);
    expect(checkRateLimit("a", opts).allowed).toBe(false);
    expect(checkRateLimit("b", opts).allowed).toBe(true);
  });
});
