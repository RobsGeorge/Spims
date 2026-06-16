/**
 * Phase-8 acceptance smoke script.
 */
import en from "../messages/en.json";
import ar from "../messages/ar.json";
import fr from "../messages/fr.json";
import { compareCatalogs } from "../lib/i18n/catalog";
import { assertThemePairsMeetAA, DEFAULT_AA_PAIRS } from "../lib/a11y/contrast";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

async function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  console.log("=== Phase-8 Acceptance Smoke ===\n");

  const arDiff = compareCatalogs(en, ar);
  await check("Arabic catalog complete", arDiff.missing.length === 0, `missing: ${arDiff.missing.length}`);

  const frDiff = compareCatalogs(en, fr);
  await check("French catalog complete", frDiff.missing.length === 0, `missing: ${frDiff.missing.length}`);

  const contrast = assertThemePairsMeetAA(DEFAULT_AA_PAIRS);
  await check("Theme tokens meet WCAG AA", contrast.ok, contrast.failures.map((f) => f.label).join(", "));

  for (const [locale, dir] of [
    ["en", "ltr"],
    ["ar", "rtl"],
    ["fr", "ltr"],
  ] as const) {
    const res = await fetch(`${BASE}/${locale}/login`);
    const html = await res.text();
    await check(`${locale} login → 200`, res.status === 200);
    await check(`${locale} dir=${dir}`, html.includes(`dir="${dir}"`) || html.includes(`dir='${dir}'`));
  }

  const arRes = await fetch(`${BASE}/ar/login`);
  const arHtml = await arRes.text();
  await check("Arabic font class on body", arHtml.includes("font-arabic"));

  const enRes = await fetch(`${BASE}/en/login`);
  const enHtml = await enRes.text();
  await check("English font class on body", enHtml.includes("font-sans"));
  await check(
    "Skip link present (auth shell)",
    enHtml.includes("Skip to main content") || enHtml.includes("skipToContent") || enHtml.includes("main-content"),
  );

  const branding = await fetch(`${BASE}/api/branding`);
  await check("Branding API → 200", branding.status === 200);

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
