import { z } from "zod";
import { ComponentKind, QuestionType } from "@prisma/client";

export const createQuestionBankSchema = z.object({
  name: z.string().min(1).max(200),
});

export const questionOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().optional(),
  matchKey: z.string().optional(),
  order: z.number().int().optional(),
});

export const createQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  prompt: z.string().min(1),
  points: z.number().positive().optional(),
  config: z.record(z.unknown()).optional(),
  aiKeyPoints: z.string().optional(),
  aiGuidance: z.string().optional(),
  options: z.array(questionOptionSchema).optional(),
});

export type CreateQuestionBankInput = z.infer<typeof createQuestionBankSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const createAssessmentSchema = z.object({
  mode: z.enum(["QUIZ", "EXAM"]),
  title: z.string().min(1).max(200),
  contentItemId: z.string().optional(),
  componentId: z.string().optional(),
  language: z.string().min(2).max(5).optional(),
  timeLimitMinutes: z.number().int().positive().optional(),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  attemptsAllowed: z.number().int().positive().optional(),
  scoringRule: z.enum(["HIGHEST", "LATEST", "AVERAGE"]).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  drawFromBankId: z.string().optional(),
  questionsToDraw: z.number().int().positive().optional(),
  questionIds: z.array(z.string()).optional(),
  resultsVisibility: z.enum(["IMMEDIATE", "AFTER_CLOSE", "ON_RELEASE"]).optional(),
  revealAnswers: z.boolean().optional(),
  enforceFullScreen: z.boolean().optional(),
  oneAtATime: z.boolean().optional(),
  noBacktrack: z.boolean().optional(),
  logFocusLoss: z.boolean().optional(),
  maxPoints: z.number().positive().optional(),
  itemWeight: z.number().positive().optional(),
  released: z.boolean().optional(),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const saveAnswerSchema = z.object({
  questionId: z.string().min(1),
  response: z.unknown(),
});

export const gradeAttemptSchema = z.object({
  grades: z.array(
    z.object({
      questionId: z.string().min(1),
      finalScore: z.number().min(0),
      feedback: z.string().optional(),
    }),
  ),
});

export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type GradeAttemptInput = z.infer<typeof gradeAttemptSchema>;

export const createAssignmentSchema = z.object({
  contentItemId: z.string().min(1),
  componentId: z.string().optional(),
  instructions: z.string().min(1),
  submissionType: z.enum(["FILE", "TEXT", "BOTH"]).optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxPoints: z.number().positive().optional(),
  itemWeight: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
  latePenaltyOverride: z.number().min(0).max(100).optional(),
  released: z.boolean().optional(),
});

export const submitAssignmentSchema = z.object({
  textBody: z.string().optional(),
  fileUrl: z.string().url().optional(),
});

export const gradeSubmissionSchema = z.object({
  rawScore: z.number().min(0),
  feedback: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

export const gradebookComponentSchema = z.object({
  name: z.string().min(1),
  weightPercent: z.number().min(0).max(100),
  kind: z.nativeEnum(ComponentKind),
});

export const updateGradebookComponentsSchema = z.object({
  components: z.array(
    gradebookComponentSchema.extend({ id: z.string().optional() }),
  ),
});

export type UpdateGradebookComponentsInput = z.infer<typeof updateGradebookComponentsSchema>;

export const reopenGradesSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type ReopenGradesInput = z.infer<typeof reopenGradesSchema>;
