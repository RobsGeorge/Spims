import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { waitlistPromoteSchema } from "@/lib/validation/enrollment";
import { promoteWaitlist } from "@/lib/services/enrollment";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "enrollment.waitlist");
    const { id } = await params;
    const data = await parseBody(req, waitlistPromoteSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const result = await promoteWaitlist(user, id, data.count, ctx);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
