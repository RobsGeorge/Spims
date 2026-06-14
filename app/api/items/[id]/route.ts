import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateContentItemSchema } from "@/lib/validation/content";
import { deleteContentItem, getItemOfferingId, updateContentItem } from "@/lib/services/content";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { errorResponse } from "@/lib/errors";

async function authorizeItemEdit(
  user: Awaited<ReturnType<typeof requireSession>>,
  itemId: string,
) {
  const offeringId = await getItemOfferingId(itemId);
  await authorize(user, "offering.editContent", {
    scopeCheck: async () => {
      await assertOfferingContentAccess(user.id, offeringId, user.roles);
      return true;
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorizeItemEdit(user, id);
    const data = await parseBody(req, updateContentItemSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const item = await updateContentItem(user, id, data, ctx);
    return NextResponse.json({ item });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await authorizeItemEdit(user, id);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const result = await deleteContentItem(user, id, ctx);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
