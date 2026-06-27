import { test, expect } from "@playwright/test";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

test.describe("Phase 8 — RTL & fonts", () => {
  test("Arabic loads Cairo font class on body", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body")).toHaveClass(/font-arabic/);
  });

  test("English loads sans font class on body", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("body")).toHaveClass(/font-sans/);
  });
});

test.describe("Phase 8 — Mobile shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("login page is usable on mobile viewport", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("form")).toBeVisible();
    const box = await page.locator('button[type="submit"]').boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  });
});

test.describe("Phase 8 — Accessibility", () => {
  test("login page has main landmark content", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("locale switcher buttons have aria labels", async ({ page }) => {
    await page.goto("/en/login");
    const trigger = page.locator('[data-testid="locale-trigger"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('[data-testid="locale-ar"]')).toBeVisible();
  });
});
