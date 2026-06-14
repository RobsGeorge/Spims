import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listWeeksWithAccess } from "@/lib/services/content";
import { errorResponse } from "@/lib/errors";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "enrollment.self");
    const { id } = await params;
    const enrolled = await db.enrollment.findFirst({
      where: {
        studentId: user.id,
        offeringId: id,
        status: { in: ["ENROLLED", "COMPLETED"] },
      },
    });
    if (!enrolled) throw AppError.forbidden("Not enrolled");
    const weeks = await listWeeksWithAccess(id, user.id);
    return NextResponse.json({ weeks });
  } catch (err) {
    return errorResponse(err);
  }
}
