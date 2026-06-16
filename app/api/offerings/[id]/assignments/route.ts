import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createAssignmentSchema } from "@/lib/validation/assessment";
import { createAssignment, listAssignments } from "@/lib/services/assignment";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { requestContext } from "@/lib/api/assessment-context";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "offering.editContent", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const assignments = await listAssignments(id);
    return NextResponse.json({ assignments });
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
    await authorize(user, "offering.editContent", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, id, user.roles);
        return true;
      },
    });
    const data = await parseBody(req, createAssignmentSchema);
    const assignment = await createAssignment(user, id, data, requestContext(req));
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
