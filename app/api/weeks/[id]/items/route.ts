import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createContentItemSchema } from "@/lib/validation/content";
import { createContentItem, getWeekOfferingId } from "@/lib/services/content";
import { assertOfferingContentAccess } from "@/lib/services/offeringScope";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id: weekId } = await params;
    const offeringId = await getWeekOfferingId(weekId);
    await authorize(user, "offering.editContent", {
      scopeCheck: async () => {
        await assertOfferingContentAccess(user.id, offeringId, user.roles);
        return true;
      },
    });
    const data = await parseBody(req, createContentItemSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const item = await createContentItem(user, weekId, data, ctx);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
