import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { reopenGradesSchema } from "@/lib/validation/assessment";
import { reopenOfferingGrades } from "@/lib/services/grading";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "grade.reopen");
    const data = await parseBody(req, reopenGradesSchema);
    const result = await reopenOfferingGrades(user, id, data, requestContext(req));
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
