import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createQuestionBankSchema } from "@/lib/validation/assessment";
import { createQuestionBank, listQuestionBanks } from "@/lib/services/questionBank";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "questionBank.manage", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const banks = await listQuestionBanks(id);
    return NextResponse.json({ banks });
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
    await authorize(user, "questionBank.manage", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const data = await parseBody(req, createQuestionBankSchema);
    const bank = await createQuestionBank(user, id, data, requestContext(req));
    return NextResponse.json({ bank }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
