import { describe, it, expect } from "vitest";

describe("gradeEssay", () => {
  it("returns null without API key", async () => {
    const prev = process.env["GOOGLE_API_KEY"];
    delete process.env["GOOGLE_API_KEY"];
    const { gradeEssay } = await import("@/lib/ai");
    const result = await gradeEssay({
      prompt: "Explain gravity",
      response: "Gravity pulls objects together",
      maxPoints: 10,
    });
    expect(result).toBeNull();
    if (prev) process.env["GOOGLE_API_KEY"] = prev;
  });
});
