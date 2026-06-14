import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentItemType } from "@prisma/client";

const mockDb = vi.hoisted(() => ({
  week: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  contentItem: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  courseOffering: { findUnique: vi.fn() },
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
vi.mock("@/lib/services/weekProgress", () => ({
  getCompletedWeekNumbers: vi.fn(async () => []),
}));

import { createWeek, createContentItem, listWeeksWithAccess } from "@/lib/services/content";
import { AppError } from "@/lib/errors";

const INS = {
  id: "ins-1",
  email: "ins@test.com",
  firstName: "Instructor",
  lastName: "User",
  roles: ["INSTRUCTOR" as const],
  preferredLocale: "en",
  countryCode: null,
};

beforeEach(() => vi.clearAllMocks());

describe("content service", () => {
  it("createWeek stores unlock date", async () => {
    mockDb.courseOffering.findUnique.mockResolvedValue({ id: "off-1", deletedAt: null });
    const unlock = new Date("2026-07-01");
    mockDb.week.create.mockResolvedValue({ id: "w1", number: 1, title: "Week 1", unlockDate: unlock });
    const week = await createWeek(INS, "off-1", {
      number: 1,
      title: "Week 1",
      unlockDate: unlock,
    });
    expect(week.id).toBe("w1");
  });

  it("createContentItem requires vimeo ID for video", async () => {
    mockDb.week.findUnique.mockResolvedValue({ id: "w1", offeringId: "off-1" });
    await expect(
      createContentItem(INS, "w1", {
        type: ContentItemType.VIDEO,
        title: "Lecture",
      }),
    ).rejects.toThrow(AppError);
  });

  it("createContentItem stores vimeo and PDF items", async () => {
    mockDb.week.findUnique.mockResolvedValue({ id: "w1", offeringId: "off-1" });
    mockDb.contentItem.create.mockResolvedValue({
      id: "i1",
      type: ContentItemType.VIDEO,
      title: "Lecture",
      vimeoId: "12345",
    });
    const video = await createContentItem(INS, "w1", {
      type: ContentItemType.VIDEO,
      title: "Lecture",
      vimeoId: "12345",
    });
    expect(video.vimeoId).toBe("12345");

    mockDb.contentItem.create.mockResolvedValue({
      id: "i2",
      type: ContentItemType.READING,
      title: "Reading",
      fileUrl: "https://storage.example.com/doc.pdf",
    });
    const reading = await createContentItem(INS, "w1", {
      type: ContentItemType.READING,
      title: "Reading",
      fileUrl: "https://storage.example.com/doc.pdf",
    });
    expect(reading.fileUrl).toContain(".pdf");
  });

  it("listWeeksWithAccess hides items for locked weeks", async () => {
    mockDb.courseOffering.findUnique.mockResolvedValue({
      id: "off-1",
      deletedAt: null,
      courseId: "c1",
      mode: "COHORT",
      weeks: [
        { number: 1, unlockDate: new Date("2020-01-01") },
        { number: 2, unlockDate: new Date("2099-01-01") },
      ],
    });
    mockDb.academicRecord.findFirst.mockResolvedValue(null);
    mockDb.week.findMany.mockResolvedValue([
      {
        id: "w1",
        number: 1,
        title: "Open",
        unlockDate: new Date("2020-01-01"),
        items: [{ id: "i1", title: "A" }],
      },
      {
        id: "w2",
        number: 2,
        title: "Locked",
        unlockDate: new Date("2099-01-01"),
        items: [{ id: "i2", title: "B" }],
      },
    ]);

    const weeks = await listWeeksWithAccess("off-1", "stu-1");
    expect(weeks[0]?.unlocked).toBe(true);
    expect(weeks[0]?.items).toHaveLength(1);
    expect(weeks[1]?.unlocked).toBe(false);
    expect(weeks[1]?.items).toHaveLength(0);
  });
});
