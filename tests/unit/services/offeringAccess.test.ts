import { describe, it, expect } from "vitest";
import { OfferingMode } from "@prisma/client";
import { isWeekUnlocked, buildWeekUnlockMap } from "@/lib/services/offeringAccess";

const now = new Date("2026-06-15T12:00:00Z");
const past = new Date("2026-06-01T00:00:00Z");
const future = new Date("2026-07-01T00:00:00Z");

describe("isWeekUnlocked", () => {
  it("preview mode unlocks only week 1", () => {
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.COHORT,
        weekNumber: 1,
        unlockDate: null,
        now,
        completedWeekNumbers: [],
        hasPassed: false,
        isPreview: true,
      }),
    ).toBe(true);
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.COHORT,
        weekNumber: 2,
        unlockDate: past,
        now,
        completedWeekNumbers: [],
        hasPassed: false,
        isPreview: true,
      }),
    ).toBe(false);
  });

  it("lifetime access after passing unlocks all weeks", () => {
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.COHORT,
        weekNumber: 5,
        unlockDate: future,
        now,
        completedWeekNumbers: [],
        hasPassed: true,
      }),
    ).toBe(true);
  });

  it("cohort gating uses unlockDate", () => {
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.COHORT,
        weekNumber: 2,
        unlockDate: past,
        now,
        completedWeekNumbers: [],
        hasPassed: false,
      }),
    ).toBe(true);
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.COHORT,
        weekNumber: 2,
        unlockDate: future,
        now,
        completedWeekNumbers: [],
        hasPassed: false,
      }),
    ).toBe(false);
  });

  it("self-paced unlocks week N when week N-1 is completed", () => {
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.SELF_PACED,
        weekNumber: 1,
        unlockDate: null,
        now,
        completedWeekNumbers: [],
        hasPassed: false,
      }),
    ).toBe(true);
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.SELF_PACED,
        weekNumber: 2,
        unlockDate: null,
        now,
        completedWeekNumbers: [],
        hasPassed: false,
      }),
    ).toBe(false);
    expect(
      isWeekUnlocked({
        offeringMode: OfferingMode.SELF_PACED,
        weekNumber: 2,
        unlockDate: null,
        now,
        completedWeekNumbers: [1],
        hasPassed: false,
      }),
    ).toBe(true);
  });
});

describe("buildWeekUnlockMap", () => {
  it("builds map for multiple weeks", () => {
    const map = buildWeekUnlockMap(
      [
        { number: 1, unlockDate: null },
        { number: 2, unlockDate: future },
      ],
      {
        offeringMode: OfferingMode.COHORT,
        now,
        completedWeekNumbers: [],
        hasPassed: false,
      },
    );
    expect(map[1]).toBe(true);
    expect(map[2]).toBe(false);
  });
});
