import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createSessionSchema } from "@/lib/validation/session";
import { createLiveSession, listOfferingSessions } from "@/lib/services/session";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "session.schedule", {
      scopeCheck: () =>
        user.roles.includes(RoleType.ADMINISTRATIVE_ADMIN) ||
        user.roles.includes(RoleType.SUPER_ADMIN) ||
        user.roles.includes(RoleType.ACADEMIC_ADMIN),
    });
    const sessions = await listOfferingSessions(id);
    return NextResponse.json({ sessions });
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
    await authorize(user, "session.schedule");
    const data = await parseBody(req, createSessionSchema);
    const session = await createLiveSession(user, id, data, requestContext(req));
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
