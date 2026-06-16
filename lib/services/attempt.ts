import { AttemptStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import {
  assertAssessmentOpen,
  assertStudentEnrolled,
  buildExamSnapshot,
  computeDueAt,
  getAssessmentAttemptCount,
  getAssessmentById,
  isAttemptActive,
  resolveAttemptQuestions,
} from "@/lib/services/assessment";
import { gradeObjectiveAnswer } from "@/lib/services/autoGrade";
import type { SaveAnswerInput } from "@/lib/validation/assessment";
import { enqueueJob } from "@/lib/jobs/queue";

export async function getAttemptForStudent(attemptId: string, studentId: string) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: {
        select: {
          title: true,
          enforceFullScreen: true,
          oneAtATime: true,
          noBacktrack: true,
          logFocusLoss: true,
        },
      },
      answers: true,
    },
  });
  if (!attempt || attempt.studentId !== studentId) throw AppError.notFound("Attempt");
  return attempt;
}

export async function startAttempt(
  actor: SessionUser,
  assessmentId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const assessment = await getAssessmentById(assessmentId);
  await assertStudentEnrolled(actor.id, assessment.offeringId);
  await assertAssessmentOpen(assessment);

  const inProgress = await db.assessmentAttempt.findFirst({
    where: { assessmentId, studentId: actor.id, status: AttemptStatus.IN_PROGRESS },
  });
  if (inProgress) return inProgress;

  const attemptCount = await getAssessmentAttemptCount(assessmentId, actor.id);
  if (attemptCount >= assessment.attemptsAllowed) {
    throw AppError.conflict("Maximum attempts reached");
  }

  const questions = await resolveAttemptQuestions(assessment);
  const snapshot = buildExamSnapshot(questions);
  const startedAt = new Date();
  const dueAt = computeDueAt(assessment, startedAt);

  const attempt = await withAudit(
    { actor, action: "assessment.take", entityType: "AssessmentAttempt", ...ctx },
    async (tx) =>
      tx.assessmentAttempt.create({
        data: {
          assessmentId,
          studentId: actor.id,
          attemptNo: attemptCount + 1,
          startedAt,
          dueAt,
          questionIds: questions.map((q) => q.id),
          examSnapshot: snapshot,
        },
      }),
  );

  await enqueueJob("attempt-auto-submit", {
    attemptId: attempt.id,
    runAt: dueAt.toISOString(),
  });

  return attempt;
}

export async function saveAttemptAnswer(
  actor: SessionUser,
  attemptId: string,
  data: SaveAnswerInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const attempt = await getAttemptForStudent(attemptId, actor.id);
  if (!isAttemptActive(attempt.status)) {
    throw AppError.conflict("Attempt is no longer in progress");
  }
  if (new Date() > attempt.dueAt) {
    throw AppError.conflict("Attempt time has expired");
  }
  if (!attempt.questionIds.includes(data.questionId)) {
    throw AppError.validation("Question not part of this attempt");
  }

  return withAudit(
    {
      actor,
      action: "assessment.take",
      entityType: "AttemptAnswer",
      entityId: attemptId,
      ...ctx,
    },
    async (tx) =>
      tx.attemptAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId, questionId: data.questionId },
        },
        create: {
          attemptId,
          questionId: data.questionId,
          response: data.response as object,
        },
        update: { response: data.response as object },
      }),
  );
}

export async function logFocusLoss(
  actor: SessionUser,
  attemptId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const attempt = await getAttemptForStudent(attemptId, actor.id);
  if (!isAttemptActive(attempt.status)) return attempt;
  if (!attempt.assessment.logFocusLoss) return attempt;

  return withAudit(
    { actor, action: "assessment.take", entityType: "AssessmentAttempt", entityId: attemptId, ...ctx },
    async (tx) =>
      tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: { focusLossCount: { increment: 1 } },
      }),
  );
}

async function finalizeAttempt(
  attemptId: string,
  status: AttemptStatus,
  actor?: SessionUser,
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: { include: { question: { include: { options: true } } } },
      assessment: true,
    },
  });
  if (!attempt || !isAttemptActive(attempt.status)) return attempt;

  const gradedAnswers = attempt.answers.map((answer) => {
    const autoScore = gradeObjectiveAnswer(answer.question, answer.response);
    return { answer, autoScore };
  });

  const totalScore = gradedAnswers.reduce((sum, { answer, autoScore }) => {
    const score = answer.finalScore ?? autoScore ?? 0;
    return sum + score;
  }, 0);

  const hasEssays = gradedAnswers.some(
    ({ answer, autoScore }) => autoScore === null && answer.question.type === "ESSAY",
  );

  const attemptStatus = hasEssays ? status : AttemptStatus.GRADED;

  type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

  const applyUpdate = async (tx: Tx) => {
    for (const { answer, autoScore } of gradedAnswers) {
      if (autoScore != null) {
        await tx.attemptAnswer.update({
          where: { id: answer.id },
          data: { autoScore, finalScore: answer.finalScore ?? autoScore },
        });
      }
    }
    return tx.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: attemptStatus,
        submittedAt: new Date(),
        totalScore,
      },
    });
  };

  if (actor) {
    return withAudit(
      { actor, action: "assessment.take", entityType: "AssessmentAttempt", entityId: attemptId },
      async (tx) => applyUpdate(tx),
    );
  }

  return db.$transaction(applyUpdate);
}

export async function submitAttempt(
  actor: SessionUser,
  attemptId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  await getAttemptForStudent(attemptId, actor.id);
  return finalizeAttempt(attemptId, AttemptStatus.SUBMITTED, actor);
}

export async function autoSubmitDueAttempt(attemptId: string) {
  const attempt = await db.assessmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || !isAttemptActive(attempt.status)) return null;
  if (new Date() < attempt.dueAt) return null;
  return finalizeAttempt(attemptId, AttemptStatus.AUTO_SUBMITTED);
}

export async function processDueAttempts() {
  const due = await db.assessmentAttempt.findMany({
    where: {
      status: AttemptStatus.IN_PROGRESS,
      dueAt: { lte: new Date() },
    },
    take: 100,
  });
  const results = [];
  for (const attempt of due) {
    results.push(await autoSubmitDueAttempt(attempt.id));
  }
  return results;
}

export async function gradeAttemptAnswers(
  actor: SessionUser,
  attemptId: string,
  grades: Array<{ questionId: string; finalScore: number; feedback?: string }>,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: true, assessment: true },
  });
  if (!attempt) throw AppError.notFound("Attempt");

  return withAudit(
    { actor, action: "assessment.grade", entityType: "AssessmentAttempt", entityId: attemptId, ...ctx },
    async (tx) => {
      for (const g of grades) {
        await tx.attemptAnswer.updateMany({
          where: { attemptId, questionId: g.questionId },
          data: {
            finalScore: g.finalScore,
            feedback: g.feedback,
            gradedById: actor.id,
            gradedAt: new Date(),
          },
        });
      }

      const answers = await tx.attemptAnswer.findMany({ where: { attemptId } });
      const totalScore = answers.reduce((s, a) => s + (a.finalScore ?? a.autoScore ?? 0), 0);

      return tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: { totalScore, status: AttemptStatus.GRADED },
      });
    },
  );
}

export async function runAiEssayGrading(attemptId: string) {
  const attempt = await db.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: { include: { question: true } },
    },
  });
  if (!attempt) return;

  const { gradeEssay } = await import("@/lib/ai");
  for (const answer of attempt.answers) {
    if (answer.question.type !== "ESSAY") continue;
    if (answer.aiSuggestedScore != null) continue;
    const text = typeof answer.response === "string"
      ? answer.response
      : JSON.stringify(answer.response ?? "");
    const result = await gradeEssay({
      prompt: answer.question.prompt,
      response: text,
      keyPoints: answer.question.aiKeyPoints,
      guidance: answer.question.aiGuidance,
      maxPoints: answer.question.points,
    });
    if (!result) continue;
    await db.attemptAnswer.update({
      where: { id: answer.id },
      data: {
        aiSuggestedScore: result.score,
        aiRationale: result.rationale,
      },
    });
  }
}
