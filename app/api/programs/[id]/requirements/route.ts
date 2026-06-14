import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { setProgramRequirementsSchema } from "@/lib/validation/program";
import { setRequirements } from "@/lib/services/program";
import { errorResponse } from "@/lib/errors";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "program.manage");
    const { id } = await params;
    const data = await parseBody(req, setProgramRequirementsSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const program = await setRequirements(user, id, data, ctx);
    return NextResponse.json({ program });
  } catch (err) {
    return errorResponse(err);
  }
}
