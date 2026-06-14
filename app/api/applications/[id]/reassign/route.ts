import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { reassignReviewerSchema } from "@/lib/validation/application";
import { reassignReviewer } from "@/lib/services/application";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "application.review");
    const { id } = await params;
    const { reviewerId } = await parseBody(req, reassignReviewerSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const application = await reassignReviewer(user, id, reviewerId, ctx);
    return NextResponse.json({ application });
  } catch (err) {
    return errorResponse(err);
  }
}
