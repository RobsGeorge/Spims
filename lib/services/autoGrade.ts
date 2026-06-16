import type { Question, QuestionOption, QuestionType } from "@prisma/client";

type QuestionWithOptions = Question & { options: QuestionOption[] };

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

function gradeMcqSingle(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const selected = typeof response === "string" ? response : null;
  if (!selected) return 0;
  const correct = question.options.find((o) => o.isCorrect);
  return correct && correct.id === selected ? question.points : 0;
}

function gradeMcqMulti(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const selected = Array.isArray(response) ? (response as string[]) : [];
  const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
  const chosen = [...selected].sort();
  if (correctIds.length === 0) return null;
  const match =
    correctIds.length === chosen.length &&
    correctIds.every((id, i) => id === chosen[i]);
  return match ? question.points : 0;
}

function gradeTrueFalse(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const val = response === true || response === "true";
  const correct = question.options.find((o) => o.isCorrect);
  if (!correct) return null;
  const correctVal = normalizeText(correct.text) === "true";
  return val === correctVal ? question.points : 0;
}

function gradeNumeric(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const config = question.config as { answer?: number; tolerance?: number } | null;
  if (config?.answer == null) return null;
  const num = typeof response === "number" ? response : Number(response);
  if (Number.isNaN(num)) return 0;
  const tolerance = config.tolerance ?? 0;
  return Math.abs(num - config.answer) <= tolerance ? question.points : 0;
}

function gradeShortAnswer(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const config = question.config as { answers?: string[] } | null;
  const answers = config?.answers ?? question.options.map((o) => o.text);
  const text = normalizeText(String(response ?? ""));
  if (!text) return 0;
  return answers.some((a) => normalizeText(a) === text) ? question.points : 0;
}

function gradeFillBlank(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const config = question.config as { blanks?: string[] } | null;
  const blanks = config?.blanks;
  if (!blanks?.length) return gradeShortAnswer(question, response);
  const values = Array.isArray(response) ? response : [response];
  const allMatch = blanks.every((b, i) => normalizeText(String(values[i] ?? "")) === normalizeText(b));
  return allMatch ? question.points : 0;
}

function gradeOrdering(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const ordered = Array.isArray(response) ? (response as string[]) : [];
  const correct = [...question.options].sort((a, b) => a.order - b.order).map((o) => o.id);
  if (ordered.length !== correct.length) return 0;
  return ordered.every((id, i) => id === correct[i]) ? question.points : 0;
}

function gradeMatching(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  const pairs = response as Record<string, string> | null;
  if (!pairs || typeof pairs !== "object") return 0;
  const options = question.options;
  let correct = 0;
  for (const opt of options) {
    if (!opt.matchKey) continue;
    if (pairs[opt.id] === opt.matchKey) correct++;
  }
  const gradable = options.filter((o) => o.matchKey).length;
  if (gradable === 0) return null;
  return (correct / gradable) * question.points;
}

export function isAutoGradable(type: QuestionType): boolean {
  return type !== "ESSAY" && type !== "FILE_UPLOAD";
}

export function gradeObjectiveAnswer(
  question: QuestionWithOptions,
  response: unknown,
): number | null {
  switch (question.type) {
    case "MCQ_SINGLE":
      return gradeMcqSingle(question, response);
    case "MCQ_MULTI":
      return gradeMcqMulti(question, response);
    case "TRUE_FALSE":
      return gradeTrueFalse(question, response);
    case "NUMERIC":
      return gradeNumeric(question, response);
    case "SHORT_ANSWER":
      return gradeShortAnswer(question, response);
    case "FILL_BLANK":
      return gradeFillBlank(question, response);
    case "ORDERING":
      return gradeOrdering(question, response);
    case "MATCHING":
      return gradeMatching(question, response);
    case "ESSAY":
    case "FILE_UPLOAD":
      return null;
    default:
      return null;
  }
}
