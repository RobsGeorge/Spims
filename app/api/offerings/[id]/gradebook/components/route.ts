import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateGradebookComponentsSchema } from "@/lib/validation/assessment";
import {
  getGradebookComponents,
  seedComponentsFromTemplate,
  updateGradebookComponents,
} from "@/lib/services/gradebook";
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
    await authorize(user, "gradebook.configure", {
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
    await seedComponentsFromTemplate(id);
    const components = await getGradebookComponents(id);
    return NextResponse.json({ components });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorize(user, "gradebook.configure", {
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
    const data = await parseBody(req, updateGradebookComponentsSchema);
    const components = await updateGradebookComponents(user, id, data, requestContext(req));
    return NextResponse.json({ components });
  } catch (err) {
    return errorResponse(err);
  }
}
