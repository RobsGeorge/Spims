import { describe, it, expect } from "vitest";
import { computeParticipationScore } from "@/lib/services/discussion";

describe("computeParticipationScore", () => {
  it("returns null for ungraded threads", () => {
    expect(
      computeParticipationScore(
        { isGraded: false, participationMinWords: null, participationMinPosts: null, participationMinReplies: null },
        [],
      ),
    ).toBeNull();
  });

  it("returns 100 when no rules configured", () => {
    expect(
      computeParticipationScore(
        { isGraded: true, participationMinWords: null, participationMinPosts: null, participationMinReplies: null },
        [{ body: "hello", parentPostId: null }],
      ),
    ).toBe(100);
  });
});
