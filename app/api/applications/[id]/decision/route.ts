import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { applicationDecisionSchema } from "@/lib/validation/application";
import { decideApplication } from "@/lib/services/application";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "application.decide");
    const { id } = await params;
    const data = await parseBody(req, applicationDecisionSchema);
    const isAnyAdm =
      user.roles.includes(RoleType.ADMINISTRATIVE_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const application = await decideApplication(user, id, data, { isAnyAdm }, ctx);
    return NextResponse.json({ application });
  } catch (err) {
    return errorResponse(err);
  }
}
