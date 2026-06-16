import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createAssessmentSchema } from "@/lib/validation/assessment";
import { createAssessment, listAssessments } from "@/lib/services/assessment";
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
    await authorize(user, "assessment.manage", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const assessments = await listAssessments(id);
    return NextResponse.json({ assessments });
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
    await authorize(user, "assessment.manage", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const data = await parseBody(req, createAssessmentSchema);
    const assessment = await createAssessment(user, id, data, requestContext(req));
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
