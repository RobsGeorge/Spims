import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { lockOfferingGrades } from "@/lib/services/grading";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "grade.lock", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const result = await lockOfferingGrades(user, id, requestContext(req));
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
