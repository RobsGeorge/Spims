import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { upsertApplicationFormSchema } from "@/lib/validation/applicationForm";
import { getApplicationForm, upsertApplicationForm } from "@/lib/services/applicationForm";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "applicationForm.manage");
    const { id } = await params;
    const form = await getApplicationForm(id);
    return NextResponse.json({ form });
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
    await authorize(user, "applicationForm.manage");
    const { id } = await params;
    const data = await parseBody(req, upsertApplicationFormSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const form = await upsertApplicationForm(user, id, data, ctx);
    return NextResponse.json({ form });
  } catch (err) {
    return errorResponse(err);
  }
}
