import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { setOfferingStaffSchema } from "@/lib/validation/offering";
import { setOfferingStaff } from "@/lib/services/offering";
import { errorResponse } from "@/lib/errors";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "offering.staff");
    const { id } = await params;
    const data = await parseBody(req, setOfferingStaffSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const offering = await setOfferingStaff(user, id, data, ctx);
    return NextResponse.json({ offering });
  } catch (err) {
    return errorResponse(err);
  }
}
