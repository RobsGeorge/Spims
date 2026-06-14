import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { submitApplicationSchema } from "@/lib/validation/application";
import { listApplications, submitApplication } from "@/lib/services/application";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const isAdm =
      user.roles.includes(RoleType.ADMINISTRATIVE_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    if (isAdm) {
      await authorize(user, "application.review");
    } else {
      await authorize(user, "application.submit");
    }
    const all = req.nextUrl.searchParams.get("all") === "true";
    const applications = await listApplications(user, { all: isAdm && all });
    return NextResponse.json({ applications });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "application.submit");
    const data = await parseBody(req, submitApplicationSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const application = await submitApplication(user, data, ctx);
    return NextResponse.json({ application }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
