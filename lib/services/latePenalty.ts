import { db } from "@/lib/db";

export type LatePenaltyTier = { daysLate: number; percent: number };

export const DEFAULT_LATE_PENALTY_TIERS: LatePenaltyTier[] = [
  { daysLate: 1, percent: 5 },
  { daysLate: 3, percent: 10 },
  { daysLate: 7, percent: 25 },
  { daysLate: 14, percent: 50 },
];

export async function getLatePenaltyTiers(): Promise<LatePenaltyTier[]> {
  const row = await db.setting.findUnique({ where: { key: "latePenaltyEscalation" } });
  if (!row?.value || !Array.isArray(row.value)) return DEFAULT_LATE_PENALTY_TIERS;
  return row.value as LatePenaltyTier[];
}

export function daysLate(dueDate: Date, submittedAt: Date): number {
  const ms = submittedAt.getTime() - dueDate.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function penaltyPercentForDays(
  days: number,
  tiers: LatePenaltyTier[],
  overridePercent?: number | null,
): number {
  if (days <= 0) return 0;
  if (overridePercent != null) return Math.min(100, Math.max(0, overridePercent));

  let penalty = 0;
  for (const tier of [...tiers].sort((a, b) => a.daysLate - b.daysLate)) {
    if (days >= tier.daysLate) penalty = tier.percent;
  }
  return Math.min(100, penalty);
}

export function applyLatePenalty(
  rawScore: number,
  dueDate: Date | null | undefined,
  submittedAt: Date,
  tiers: LatePenaltyTier[],
  overridePercent?: number | null,
): { finalScore: number; penaltyPercent: number; isLate: boolean } {
  if (!dueDate) {
    return { finalScore: rawScore, penaltyPercent: 0, isLate: false };
  }
  const late = daysLate(dueDate, submittedAt);
  const penaltyPercent = penaltyPercentForDays(late, tiers, overridePercent);
  const finalScore = Math.max(0, rawScore * (1 - penaltyPercent / 100));
  return { finalScore, penaltyPercent, isLate: late > 0 };
}
