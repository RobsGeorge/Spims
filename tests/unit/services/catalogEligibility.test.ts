import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEvaluate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/enrollmentRules", () => ({
  evaluateEnrollmentRules: mockEvaluate,
}));

import { annotateCatalogEligibility } from "@/lib/services/catalogEligibility";

beforeEach(() => vi.clearAllMocks());

const OFFERINGS = [
  {
    id: "off-1",
    mode: "COHORT",
    course: { code: "TH101", title: "Intro", isFree: true, isStandalone: false },
    semester: { name: "Fall" },
  },
  {
    id: "off-2",
    mode: "SELF_PACED",
    course: { code: "TH102", title: "History", isFree: false, isStandalone: true },
    semester: null,
  },
  {
    id: "off-3",
    mode: "COHORT",
    course: { code: "TH103", title: "Liturgy", isFree: false, isStandalone: false },
    semester: { name: "Fall" },
  },
];

describe("annotateCatalogEligibility", () => {
  it("hides offerings that fail hard rules and keeps waitlistable ones", async () => {
    mockEvaluate
      .mockResolvedValueOnce({
        allowed: false,
        waitlist: false,
        errors: ["Missing prerequisite for course prereq-1"],
        warnings: [],
      })
      .mockResolvedValueOnce({
        allowed: true,
        waitlist: true,
        errors: [],
        warnings: [],
      })
      .mockResolvedValueOnce({
        allowed: true,
        waitlist: false,
        errors: [],
        warnings: ["Schedule conflict with another enrolled course"],
      });

    const actual = await annotateCatalogEligibility({
      studentId: "stu-1",
      studentProgramId: "sp-1",
      offerings: OFFERINGS,
    });

    expect(actual).toHaveLength(2);
    expect(actual[0]?.id).toBe("off-2");
    expect(actual[0]?.waitlist).toBe(true);
    expect(actual[1]?.id).toBe("off-3");
    expect(actual[1]?.warnings).toContain("Schedule conflict with another enrolled course");
  });

  it("hides already enrolled offerings", async () => {
    mockEvaluate.mockResolvedValue({
      allowed: false,
      waitlist: false,
      errors: ["Already enrolled or waitlisted"],
      warnings: [],
    });

    const actual = await annotateCatalogEligibility({
      studentId: "stu-1",
      offerings: [OFFERINGS[0]!],
    });

    expect(actual).toHaveLength(0);
  });
});
