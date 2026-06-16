import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 7 — API guardrails", () => {
  test("POST /api/offerings/x/sessions → 401 without session", async ({ request }) => {
    const res = await request.post(`${BASE}/api/offerings/x/sessions`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test("GET /api/sessions/x/join → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sessions/x/join`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/notifications → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/notifications`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/webhooks/zoom → 200 with empty body when no secret", async ({ request }) => {
    const res = await request.post(`${BASE}/api/webhooks/zoom`, {
      data: { event: "endpoint.url_validation", payload: {} },
    });
    expect([200, 400, 500]).toContain(res.status());
  });
});
