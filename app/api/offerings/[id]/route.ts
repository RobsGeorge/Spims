import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateOfferingSchema } from "@/lib/validation/offering";
import { getOfferingById, updateOffering } from "@/lib/services/offering";
import { isOfferingStaff } from "@/lib/services/offeringScope";
import { errorResponse } from "@/lib/errors";

async function canViewOffering(
  user: { id: string; roles: RoleType[] },
  offeringId: string,
): Promise<boolean> {
  if (
    user.roles.includes(RoleType.SUPER_ADMIN) ||
    user.roles.includes(RoleType.ACADEMIC_ADMIN)
  ) {
    return true;
  }
  return isOfferingStaff(user.id, offeringId);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const isAca =
      user.roles.includes(RoleType.ACADEMIC_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    if (isAca) {
      await authorize(user, "offering.manage");
    } else {
      await authorize(user, "offering.editContent", {
        scopeCheck: () => canViewOffering(user, id),
      });
    }
    const offering = await getOfferingById(id);
    return NextResponse.json({ offering });
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
    await authorize(user, "offering.manage");
    const { id } = await params;
    const data = await parseBody(req, updateOfferingSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const offering = await updateOffering(user, id, data, ctx);
    return NextResponse.json({ offering });
  } catch (err) {
    return errorResponse(err);
  }
}
