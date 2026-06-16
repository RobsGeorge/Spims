import { AttemptStatus, ScoringRule } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { CreateAssessmentInput } from "@/lib/validation/assessment";
import type { Question, QuestionOption } from "@prisma/client";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export async function assertStudentEnrolled(studentId: string, offeringId: string) {
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_offeringId: { studentId, offeringId } },
  });
  if (!enrollment || enrollment.status !== "ENROLLED") {
    throw AppError.forbidden("Not enrolled in this offering");
  }
  return enrollment;
}

export async function listAssessments(offeringId: string) {
  return db.assessment.findMany({
    where: { offeringId },
    include: { _count: { select: { attempts: true, questions: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAssessmentById(id: string) {
  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      questions: { include: { question: { include: { options: true } } }, orderBy: { order: "asc" } },
    },
  });
  if (!assessment) throw AppError.notFound("Assessment");
  return assessment;
}

export async function createAssessment(
  actor: SessionUser,
  offeringId: string,
  data: CreateAssessmentInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const offering = await db.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");

  return withAudit(
    { actor, action: "assessment.manage", entityType: "Assessment", ...ctx },
    async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          offeringId,
          mode: data.mode,
          title: data.title,
          contentItemId: data.contentItemId,
          componentId: data.componentId,
          language: data.language ?? "en",
          timeLimitMinutes: data.timeLimitMinutes,
          opensAt: data.opensAt ? new Date(data.opensAt) : undefined,
          closesAt: data.closesAt ? new Date(data.closesAt) : undefined,
          attemptsAllowed: data.attemptsAllowed ?? 1,
          scoringRule: data.scoringRule ?? "HIGHEST",
          shuffleQuestions: data.shuffleQuestions ?? true,
          shuffleOptions: data.shuffleOptions ?? true,
          drawFromBankId: data.drawFromBankId,
          questionsToDraw: data.questionsToDraw,
          resultsVisibility: data.resultsVisibility ?? "ON_RELEASE",
          revealAnswers: data.revealAnswers ?? false,
          enforceFullScreen: data.enforceFullScreen ?? false,
          oneAtATime: data.oneAtATime ?? false,
          noBacktrack: data.noBacktrack ?? false,
          logFocusLoss: data.logFocusLoss ?? true,
          maxPoints: data.maxPoints ?? 100,
          itemWeight: data.itemWeight,
          released: data.released ?? false,
        },
      });

      if (data.questionIds?.length) {
        await tx.assessmentQuestion.createMany({
          data: data.questionIds.map((questionId, order) => ({
            assessmentId: assessment.id,
            questionId,
            order,
          })),
        });
      }

      return assessment;
    },
  );
}

export async function resolveAttemptQuestions(
  assessment: {
    id: string;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    drawFromBankId: string | null;
    questionsToDraw: number | null;
    questions: Array<{ questionId: string; order: number; question: Question & { options: QuestionOption[] } }>;
  },
): Promise<Array<Question & { options: QuestionOption[] }>> {
  let pool: Array<Question & { options: QuestionOption[] }>;

  if (assessment.drawFromBankId && assessment.questionsToDraw) {
    const bankQuestions = await db.question.findMany({
      where: { bankId: assessment.drawFromBankId },
      include: { options: { orderBy: { order: "asc" } } },
    });
    if (bankQuestions.length < assessment.questionsToDraw) {
      throw AppError.validation("Not enough questions in bank to draw");
    }
    pool = shuffle(bankQuestions).slice(0, assessment.questionsToDraw);
  } else {
    pool = assessment.questions.map((q) => q.question);
  }

  if (assessment.shuffleQuestions) pool = shuffle(pool);

  return pool.map((q) => ({
    ...q,
    options: assessment.shuffleOptions ? shuffle(q.options) : q.options,
  }));
}

export function buildExamSnapshot(
  questions: Array<Question & { options: QuestionOption[] }>,
) {
  return {
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      config: q.config,
      options: q.options.map((o) => ({ id: o.id, text: o.text, matchKey: o.matchKey })),
    })),
  };
}

export function scoreFromAttempts(
  attempts: Array<{ totalScore: number | null; submittedAt: Date | null; attemptNo: number }>,
  rule: ScoringRule,
): number | null {
  const scored = attempts.filter((a) => a.totalScore != null);
  if (scored.length === 0) return null;
  const scores = scored.map((a) => a.totalScore!);
  switch (rule) {
    case "HIGHEST":
      return Math.max(...scores);
    case "LATEST": {
      const latest = [...scored].sort(
        (a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0),
      )[0];
      return latest?.totalScore ?? null;
    }
    case "AVERAGE":
      return scores.reduce((s, v) => s + v, 0) / scores.length;
    default:
      return Math.max(...scores);
  }
}

export async function getAssessmentAttemptCount(assessmentId: string, studentId: string) {
  return db.assessmentAttempt.count({ where: { assessmentId, studentId } });
}

export function computeDueAt(
  assessment: { timeLimitMinutes: number | null; closesAt: Date | null },
  startedAt: Date,
): Date {
  const candidates: Date[] = [];
  if (assessment.timeLimitMinutes) {
    candidates.push(new Date(startedAt.getTime() + assessment.timeLimitMinutes * 60_000));
  }
  if (assessment.closesAt) candidates.push(assessment.closesAt);
  if (candidates.length === 0) {
    return new Date(startedAt.getTime() + 24 * 60 * 60_000);
  }
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

export async function assertAssessmentOpen(assessment: {
  opensAt: Date | null;
  closesAt: Date | null;
}) {
  const now = new Date();
  if (assessment.opensAt && now < assessment.opensAt) {
    throw AppError.forbidden("Assessment is not open yet");
  }
  if (assessment.closesAt && now > assessment.closesAt) {
    throw AppError.forbidden("Assessment is closed");
  }
}

export function isAttemptActive(status: AttemptStatus): boolean {
  return status === AttemptStatus.IN_PROGRESS;
}
