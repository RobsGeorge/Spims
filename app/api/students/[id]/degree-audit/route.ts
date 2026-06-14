import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseQuery, z } from "@/lib/validation";
import { getDegreeAudit } from "@/lib/services/degreeAudit";
import { errorResponse } from "@/lib/errors";

const querySchema = z.object({
  programId: z.string().min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id: studentId } = await params;
    const isOwn = user.id === studentId;
    const isAca =
      user.roles.includes(RoleType.ACADEMIC_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    if (isOwn) {
      await authorize(user, "degreeAudit.view");
    } else if (!isAca) {
      throw (await import("@/lib/errors")).AppError.forbidden();
    } else {
      await authorize(user, "degreeAudit.view");
    }
    const { programId } = parseQuery(req.nextUrl.searchParams, querySchema);
    const audit = await getDegreeAudit(studentId, programId);
    return NextResponse.json({ audit });
  } catch (err) {
    return errorResponse(err);
  }
}
