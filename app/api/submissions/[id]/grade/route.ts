import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { gradeSubmissionSchema } from "@/lib/validation/assessment";
import { gradeSubmission } from "@/lib/services/assignment";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "assessment.grade");
    const data = await parseBody(req, gradeSubmissionSchema);
    const submission = await gradeSubmission(user, id, data, requestContext(req));
    return NextResponse.json({ submission });
  } catch (err) {
    return errorResponse(err);
  }
}
