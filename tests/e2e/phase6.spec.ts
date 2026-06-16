import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 6 — API guardrails", () => {
  test("POST /api/assessments/x/attempts → 401 without session", async ({ request }) => {
    const res = await request.post(`${BASE}/api/assessments/x/attempts`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/offerings/x/gradebook → 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE}/api/offerings/x/gradebook`);
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/attempts/x/answers → 401 without session", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/attempts/x/answers`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test("POST /api/offerings/x/grades/submit → 401 without session", async ({ request }) => {
    const res = await request.post(`${BASE}/api/offerings/x/grades/submit`);
    expect(res.status()).toBe(401);
  });
});
