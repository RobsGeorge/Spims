import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateGradingSchemeSchema } from "@/lib/validation/gradingScheme";
import { getGradingSchemeById, updateGradingScheme, deleteGradingScheme } from "@/lib/services/gradingScheme";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const scheme = await getGradingSchemeById(id);
    return NextResponse.json({ scheme });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "gradingScheme.manage");
    const { id } = await params;
    const data = await parseBody(req, updateGradingSchemeSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const scheme = await updateGradingScheme(user, id, data, ctx);
    return NextResponse.json({ scheme });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "gradingScheme.manage");
    const { id } = await params;
    const ctx = {};
    await deleteGradingScheme(user, id, ctx);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
