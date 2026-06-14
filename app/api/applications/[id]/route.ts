import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateApplicationSchema } from "@/lib/validation/application";
import {
  assertApplicationAccess,
  getApplicationById,
  updateApplication,
} from "@/lib/services/application";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const application = await getApplicationById(id);
    if (!(await assertApplicationAccess(user, application))) {
      await authorize(user, "application.review");
    }
    return NextResponse.json({ application });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const application = await getApplicationById(id);
    if (application.applicantId !== user.id) {
      await authorize(user, "application.review");
    }
    const data = await parseBody(req, updateApplicationSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const updated = await updateApplication(user, id, data, ctx);
    return NextResponse.json({ application: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
