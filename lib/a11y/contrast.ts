/** Parse `hsl(345 60% 30%)` or space-separated HSL into RGB 0–255. */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function parseHslToken(token: string): [number, number, number] | null {
  const parts = token.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]!);
  const s = parseFloat(parts[1]!.replace("%", ""));
  const l = parseFloat(parts[2]!.replace("%", ""));
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null;
  return [h, s, l];
}

/** WCAG relative luminance. */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastRatioFromHsl(fgToken: string, bgToken: string): number | null {
  const f = parseHslToken(fgToken);
  const b = parseHslToken(bgToken);
  if (!f || !b) return null;
  const [fr, fG, fb] = hslToRgb(...f);
  const [br, bG, bb] = hslToRgb(...b);
  const lFg = relativeLuminance(fr, fG, fb);
  const lBg = relativeLuminance(br, bG, bb);
  return contrastRatio(lFg, lBg);
}

export type ThemeTokenPair = { foreground: string; background: string; label: string };

/** Default light-theme pairs that must meet WCAG AA (4.5:1) for normal text. */
export const DEFAULT_AA_PAIRS: ThemeTokenPair[] = [
  { label: "body", foreground: "222.2 84% 4.9%", background: "0 0% 100%" },
  { label: "primary button", foreground: "0 0% 98%", background: "345 60% 30%" },
  { label: "muted text", foreground: "215.4 16.3% 46.9%", background: "0 0% 100%" },
];

export function assertThemePairsMeetAA(
  pairs: ThemeTokenPair[],
  minRatio = 4.5,
): { ok: boolean; failures: Array<{ label: string; ratio: number }> } {
  const failures: Array<{ label: string; ratio: number }> = [];
  for (const pair of pairs) {
    const ratio = contrastRatioFromHsl(pair.foreground, pair.background);
    if (ratio == null || ratio < minRatio) {
      failures.push({ label: pair.label, ratio: ratio ?? 0 });
    }
  }
  return { ok: failures.length === 0, failures };
}
