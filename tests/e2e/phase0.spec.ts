import { test, expect } from "@playwright/test";

test.describe("Phase 0 — Locale & RTL", () => {
  test("English page loads with dir=ltr", async ({ page }) => {
    await page.goto("/en");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "en");
    await expect(html).toHaveAttribute("dir", "ltr");
  });

  test("Arabic page loads with dir=rtl", async ({ page }) => {
    await page.goto("/ar");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "ar");
    await expect(html).toHaveAttribute("dir", "rtl");
  });

  test("French page loads with dir=ltr", async ({ page }) => {
    await page.goto("/fr");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "fr");
    await expect(html).toHaveAttribute("dir", "ltr");
  });

  test("Locale switcher navigates to Arabic", async ({ page }) => {
    await page.goto("/en");
    await page.click('[data-testid="locale-trigger"]');
    await page.click('[data-testid="locale-ar"]');
    await expect(page).toHaveURL(/\/ar/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("Locale switcher navigates to French", async ({ page }) => {
    await page.goto("/en");
    await page.click('[data-testid="locale-trigger"]');
    await page.click('[data-testid="locale-fr"]');
    await expect(page).toHaveURL(/\/fr/);
  });
});

test.describe("Phase 0 — Protected route smoke test", () => {
  test("GET /api/_test/protected with no session returns 401", async ({ request }) => {
    const res = await request.get("/api/_test/protected");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });
});

test.describe("Phase 0 — Branding public route", () => {
  test("GET /api/branding returns 200 with expected shape", async ({ request }) => {
    const res = await request.get("/api/branding");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("siteName");
    expect(body).toHaveProperty("tokens");
  });
});
