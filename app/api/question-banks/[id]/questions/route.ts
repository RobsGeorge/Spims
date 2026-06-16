import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createQuestionSchema } from "@/lib/validation/assessment";
import { createQuestion, listQuestions } from "@/lib/services/questionBank";
import { db } from "@/lib/db";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse, AppError } from "@/lib/errors";

async function getBankOfferingId(bankId: string) {
  const bank = await db.questionBank.findUnique({
    where: { id: bankId },
    include: { course: { include: { offerings: { where: { deletedAt: null }, take: 1 } } } },
  });
  if (!bank) throw AppError.notFound("QuestionBank");
  const offering = bank.course.offerings[0];
  if (!offering) throw AppError.notFound("Offering");
  return offering.id;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "questionBank.manage");
    const questions = await listQuestions(id);
    return NextResponse.json({ questions });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const offeringId = await getBankOfferingId(id);
    const { assertOfferingContentAccess } = await import("@/lib/services/offeringScope");
    await authorize(user, "questionBank.manage", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, offeringId, user.roles);
        return true;
      },
    });
    const data = await parseBody(req, createQuestionSchema);
    const question = await createQuestion(user, id, data, requestContext(req));
    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
