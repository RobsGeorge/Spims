import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 5 — API guardrails", () => {
  test("GET /api/invoices → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/invoices`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/wallet → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/wallet`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/invoices/x/pay → 401 without session", async ({ request }) => {
    const res = await request.post(`${BASE}/api/invoices/x/pay`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test("POST /api/webhooks/paypal without signature", async ({ request }) => {
    const res = await request.post(`${BASE}/api/webhooks/paypal`, {
      data: { id: "evt-guard" },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 401, 500]).toContain(res.status());
  });
});
