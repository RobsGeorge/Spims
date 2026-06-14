import { describe, it, expect, vi, beforeEach } from "vitest";
import { OfferingMode } from "@prisma/client";

const mockDb = vi.hoisted(() => ({
  courseOffering: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  course: { findUnique: vi.fn() },
  semester: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  week: { create: vi.fn() },
  contentItem: { createMany: vi.fn() },
  offeringStaff: { deleteMany: vi.fn(), createMany: vi.fn(), findFirst: vi.fn() },
  academicRecord: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));
vi.mock("@/lib/services/offeringScope", () => ({
  getStaffOfferingIds: vi.fn().mockResolvedValue([]),
  isOfferingStaff: vi.fn(),
}));

import {
  createOffering,
  cloneOfferingContent,
  setOfferingPricing,
  setOfferingStaff,
  resolveOfferingPricing,
  getOfferingPreview,
} from "@/lib/services/offering";
import { AppError } from "@/lib/errors";

const ACA = {
  id: "aca-1",
  email: "aca@test.com",
  firstName: "ACA",
  lastName: "Admin",
  roles: ["ACADEMIC_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const FIN = {
  id: "fin-1",
  email: "fin@test.com",
  firstName: "Finance",
  lastName: "Admin",
  roles: ["FINANCIAL_ADMIN" as const],
  preferredLocale: "en",
  countryCode: null,
};

const COURSE = {
  id: "course-1",
  code: "CS101",
  title: "Intro",
  defaultPriceUsd: 10000,
  defaultPriceEgp: 500000,
  isFree: false,
  deletedAt: null,
};

beforeEach(() => vi.clearAllMocks());

describe("resolveOfferingPricing", () => {
  it("uses course defaults when no overrides", () => {
    const pricing = resolveOfferingPricing(
      { priceUsdOverride: null, priceEgpOverride: null },
      COURSE,
    );
    expect(pricing.priceUsd).toBe(10000);
    expect(pricing.priceEgp).toBe(500000);
  });

  it("uses offering overrides when set", () => {
    const pricing = resolveOfferingPricing(
      { priceUsdOverride: 15000, priceEgpOverride: null },
      COURSE,
    );
    expect(pricing.priceUsd).toBe(15000);
    expect(pricing.priceEgp).toBe(500000);
  });
});

describe("createOffering", () => {
  it("requires semester for cohort mode", async () => {
    mockDb.course.findUnique.mockResolvedValue(COURSE);
    await expect(
      createOffering(ACA, { courseId: "course-1", mode: OfferingMode.COHORT }),
    ).rejects.toThrow(AppError);
  });

  it("creates self-paced offering without semester", async () => {
    mockDb.course.findUnique.mockResolvedValue(COURSE);
    mockDb.courseOffering.create.mockResolvedValue({ id: "off-1", mode: OfferingMode.SELF_PACED });
    const offering = await createOffering(ACA, {
      courseId: "course-1",
      mode: OfferingMode.SELF_PACED,
    });
    expect(offering.id).toBe("off-1");
  });
});

describe("cloneOfferingContent", () => {
  it("rejects different courses", async () => {
    mockDb.courseOffering.findUnique
      .mockResolvedValueOnce({ id: "target", courseId: "c1", deletedAt: null, weeks: [] })
      .mockResolvedValueOnce({ id: "source", courseId: "c2", deletedAt: null, weeks: [] });
    await expect(
      cloneOfferingContent(ACA, "target", { sourceOfferingId: "source" }),
    ).rejects.toThrow(AppError);
  });

  it("clones weeks and items", async () => {
    mockDb.courseOffering.findUnique
      .mockResolvedValueOnce({ id: "target", courseId: "c1", deletedAt: null, weeks: [] })
      .mockResolvedValueOnce({
        id: "source",
        courseId: "c1",
        deletedAt: null,
        weeks: [
          {
            number: 1,
            title: "Week 1",
            unlockDate: null,
            order: 1,
            items: [{ type: "TEXT", title: "Intro", order: 0, vimeoId: null, fileUrl: null, body: "Hi" }],
          },
        ],
      });
    mockDb.week.create.mockResolvedValue({ id: "w-new" });
    mockDb.contentItem.createMany.mockResolvedValue({ count: 1 });
    mockDb.courseOffering.findUnique.mockResolvedValueOnce({ id: "target", weeks: [] });

    await cloneOfferingContent(ACA, "target", { sourceOfferingId: "source" });
    expect(mockDb.week.create).toHaveBeenCalled();
    expect(mockDb.contentItem.createMany).toHaveBeenCalled();
  });
});

describe("setOfferingStaff", () => {
  it("replaces staff assignments", async () => {
    mockDb.courseOffering.findUnique.mockResolvedValue({ id: "off-1", deletedAt: null });
    mockDb.user.findUnique.mockResolvedValue({ id: "ins-1" });
    mockDb.offeringStaff.deleteMany.mockResolvedValue({ count: 0 });
    mockDb.offeringStaff.createMany.mockResolvedValue({ count: 1 });
    mockDb.courseOffering.findUnique.mockResolvedValueOnce({ id: "off-1", staff: [] });

    await setOfferingStaff(ACA, "off-1", {
      staff: [{ userId: "ins-1", role: "INSTRUCTOR" }],
    });
    expect(mockDb.offeringStaff.createMany).toHaveBeenCalled();
  });
});

describe("setOfferingPricing", () => {
  it("updates price overrides", async () => {
    mockDb.courseOffering.findUnique.mockResolvedValue({
      id: "off-1",
      deletedAt: null,
      priceUsdOverride: null,
      priceEgpOverride: null,
      course: COURSE,
    });
    mockDb.courseOffering.update.mockResolvedValue({
      id: "off-1",
      priceUsdOverride: 20000,
      priceEgpOverride: 600000,
    });
    const offering = await setOfferingPricing(FIN, "off-1", {
      priceUsdOverride: 20000,
      priceEgpOverride: 600000,
    });
    expect(offering.priceUsdOverride).toBe(20000);
  });
});

describe("getOfferingPreview", () => {
  it("returns week titles and week 1 items only", async () => {
    mockDb.courseOffering.findUnique.mockResolvedValue({
      id: "off-1",
      deletedAt: null,
      mode: OfferingMode.COHORT,
      status: "OPEN",
      priceUsdOverride: null,
      priceEgpOverride: null,
      course: COURSE,
      weeks: [
        {
          number: 1,
          title: "Introduction",
          items: [{ id: "i1", type: "TEXT", title: "Welcome", body: "Hello" }],
        },
        { number: 2, title: "Deep dive", items: [{ id: "i2", type: "TEXT", title: "Secret", body: "Hidden" }] },
      ],
    });
    const preview = await getOfferingPreview("off-1");
    expect(preview.weeks).toHaveLength(2);
    expect(preview.week1Items).toHaveLength(1);
    expect(preview.week1Items[0]?.title).toBe("Welcome");
  });
});
