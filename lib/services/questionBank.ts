import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import type { CreateQuestionBankInput, CreateQuestionInput } from "@/lib/validation/assessment";

async function getOfferingCourseId(offeringId: string): Promise<string> {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    select: { courseId: true, deletedAt: true },
  });
  if (!offering || offering.deletedAt) throw AppError.notFound("Offering");
  return offering.courseId;
}

export async function listQuestionBanks(offeringId: string) {
  const courseId = await getOfferingCourseId(offeringId);
  return db.questionBank.findMany({
    where: { courseId },
    include: { _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createQuestionBank(
  actor: SessionUser,
  offeringId: string,
  data: CreateQuestionBankInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const courseId = await getOfferingCourseId(offeringId);
  return withAudit(
    { actor, action: "questionBank.manage", entityType: "QuestionBank", ...ctx },
    async (tx) =>
      tx.questionBank.create({
        data: { courseId, name: data.name },
      }),
  );
}

export async function listQuestions(bankId: string) {
  const bank = await db.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw AppError.notFound("QuestionBank");
  return db.question.findMany({
    where: { bankId },
    include: { options: { orderBy: { order: "asc" } } },
    orderBy: { prompt: "asc" },
  });
}

export async function createQuestion(
  actor: SessionUser,
  bankId: string,
  data: CreateQuestionInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const bank = await db.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw AppError.notFound("QuestionBank");

  return withAudit(
    { actor, action: "questionBank.manage", entityType: "Question", ...ctx },
    async (tx) =>
      tx.question.create({
        data: {
          bankId,
          type: data.type,
          prompt: data.prompt,
          points: data.points ?? 1,
          config: data.config as Prisma.InputJsonValue | undefined,
          aiKeyPoints: data.aiKeyPoints,
          aiGuidance: data.aiGuidance,
          options: data.options
            ? {
                create: data.options.map((o, i) => ({
                  text: o.text,
                  isCorrect: o.isCorrect ?? false,
                  matchKey: o.matchKey,
                  order: o.order ?? i,
                })),
              }
            : undefined,
        },
        include: { options: true },
      }),
  );
}
