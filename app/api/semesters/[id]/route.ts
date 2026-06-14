import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateSemesterSchema } from "@/lib/validation/semester";
import { updateSemester } from "@/lib/services/semester";
import { errorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "semester.manage");
    const { id } = await params;
    const data = await parseBody(req, updateSemesterSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const semester = await updateSemester(user, id, data, ctx);
    return NextResponse.json({ semester });
  } catch (err) {
    return errorResponse(err);
  }
}
