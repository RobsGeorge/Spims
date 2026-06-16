import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { importAttendanceSchema } from "@/lib/validation/session";
import { importAttendanceFromZoom } from "@/lib/services/attendance";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await authorize(user, "attendance.import", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, session.offeringId, user.roles);
        return true;
      },
    });

    const body = await parseBody(req, importAttendanceSchema);
    const records = await importAttendanceFromZoom(user, id, body.participants, requestContext(req));
    return NextResponse.json({ records });
  } catch (err) {
    return errorResponse(err);
  }
}
