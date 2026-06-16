import { test, expect } from "@playwright/test";

test.describe("Phase 9 — Health & hardening", () => {
  test("health endpoint returns database status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.checks.database).toBe(true);
    expect(["ok", "degraded"]).toContain(body.status);
  });

  test("responses include security headers", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.headers()["x-frame-options"]?.toLowerCase()).toBe("deny");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("branding endpoint still public after hardening", async ({ request }) => {
    const res = await request.get("/api/branding");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("siteName");
  });
});
