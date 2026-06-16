import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize, can } from "@/lib/auth/authorize";
import { getGradebook, getOfferingGradebook } from "@/lib/services/gradebook";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { errorResponse } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const studentId = req.nextUrl.searchParams.get("studentId");

    if (studentId && studentId !== user.id) {
      await authorize(user, "gradebook.enterGrades", {
        scopeCheck: async () => {
          await assertOfferingContentAccess(user.id, id, user.roles);
          return true;
        },
      });
      const gradebook = await getGradebook(id, studentId, false);
      return NextResponse.json({ gradebook });
    }

    if (can(user, "gradebook.enterGrades")) {
      await authorize(user, "gradebook.enterGrades", {
        scopeCheck: async () => {
          if (
            user.roles.includes(RoleType.ACADEMIC_ADMIN) ||
            user.roles.includes(RoleType.SUPER_ADMIN)
          ) {
            return true;
          }
          await assertOfferingContentAccess(user.id, id, user.roles);
          return true;
        },
      });
      const rows = await getOfferingGradebook(id, false);
      return NextResponse.json({ rows });
    }

    await authorize(user, "transcript.viewOwn");
    const gradebook = await getGradebook(id, user.id, true);
    return NextResponse.json({ gradebook });
  } catch (err) {
    return errorResponse(err);
  }
}
