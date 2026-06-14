import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { assignRoundRobinReviewer } from "@/lib/services/reviewer";

beforeEach(() => vi.clearAllMocks());

describe("reviewer service", () => {
  it("returns null when no reviewers", async () => {
    mockDb.user.findFirst.mockResolvedValue(null);
    const result = await assignRoundRobinReviewer();
    expect(result).toBeNull();
  });

  it("picks reviewer and bumps lastReviewedAt", async () => {
    const reviewer = { id: "rev-1", email: "r@test.com" };
    mockDb.user.findFirst.mockResolvedValue(reviewer);
    mockDb.user.update.mockResolvedValue(reviewer);

    const result = await assignRoundRobinReviewer();
    expect(result?.id).toBe("rev-1");
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "rev-1" } }),
    );
  });
});
