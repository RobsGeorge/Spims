import { OfferingMode } from "@prisma/client";

export type WeekAccessInput = {
  offeringMode: OfferingMode;
  weekNumber: number;
  unlockDate: Date | null;
  now: Date;
  /** Week numbers the student has fully completed (self-paced gating). */
  completedWeekNumbers: number[];
  /** Student has a passing academic record for the course. */
  hasPassed: boolean;
  /** Public preview — only week 1 content is accessible. */
  isPreview?: boolean;
};

/** Whether a week is unlocked for the given access context. */
export function isWeekUnlocked(input: WeekAccessInput): boolean {
  if (input.isPreview) return input.weekNumber === 1;
  if (input.hasPassed) return true;
  if (input.weekNumber === 1) return true;

  if (input.offeringMode === OfferingMode.COHORT) {
    if (!input.unlockDate) return false;
    return input.unlockDate <= input.now;
  }

  return input.completedWeekNumbers.includes(input.weekNumber - 1);
}

/** Build unlock map for all weeks in an offering. */
export function buildWeekUnlockMap(
  weeks: Array<{ number: number; unlockDate: Date | null }>,
  ctx: Omit<WeekAccessInput, "weekNumber" | "unlockDate">,
): Record<number, boolean> {
  const map: Record<number, boolean> = {};
  for (const week of weeks) {
    map[week.number] = isWeekUnlocked({
      ...ctx,
      weekNumber: week.number,
      unlockDate: week.unlockDate,
    });
  }
  return map;
}
