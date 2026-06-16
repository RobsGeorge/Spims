import { describe, it, expect } from "vitest";
import { gradeObjectiveAnswer, isAutoGradable } from "@/lib/services/autoGrade";
import type { Question, QuestionOption } from "@prisma/client";

function q(
  partial: Partial<Question> & { type: Question["type"]; options?: QuestionOption[] },
): Question & { options: QuestionOption[] } {
  return {
    id: "q1",
    bankId: "b1",
    prompt: "Test",
    points: 10,
    config: partial.config ?? null,
    aiKeyPoints: null,
    aiGuidance: null,
    options: partial.options ?? [],
    ...partial,
  };
}

describe("autoGrade", () => {
  it("grades MCQ single correctly", () => {
    const question = q({
      type: "MCQ_SINGLE",
      options: [
        { id: "a", questionId: "q1", text: "A", isCorrect: false, matchKey: null, order: 0 },
        { id: "b", questionId: "q1", text: "B", isCorrect: true, matchKey: null, order: 1 },
      ],
    });
    expect(gradeObjectiveAnswer(question, "b")).toBe(10);
    expect(gradeObjectiveAnswer(question, "a")).toBe(0);
  });

  it("grades numeric with tolerance", () => {
    const question = q({
      type: "NUMERIC",
      config: { answer: 42, tolerance: 0.5 },
      options: [],
    });
    expect(gradeObjectiveAnswer(question, 42.3)).toBe(10);
    expect(gradeObjectiveAnswer(question, 50)).toBe(0);
  });

  it("grades true/false and rejects unanswered when correct is false", () => {
    const question = q({
      type: "TRUE_FALSE",
      options: [
        { id: "t", questionId: "q1", text: "true", isCorrect: false, matchKey: null, order: 0 },
        { id: "f", questionId: "q1", text: "false", isCorrect: true, matchKey: null, order: 1 },
      ],
    });
    expect(gradeObjectiveAnswer(question, false)).toBe(10);
    expect(gradeObjectiveAnswer(question, true)).toBe(0);
    expect(gradeObjectiveAnswer(question, null)).toBe(0);
    expect(gradeObjectiveAnswer(question, undefined)).toBe(0);
  });

  it("essay is not auto gradable", () => {
    expect(isAutoGradable("ESSAY")).toBe(false);
    const question = q({ type: "ESSAY", options: [] });
    expect(gradeObjectiveAnswer(question, "long text")).toBe(null);
  });
});
