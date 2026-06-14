import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateProgramSchema } from "@/lib/validation/program";
import { getProgramById, updateProgram, deleteProgram } from "@/lib/services/program";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "program.read");
    const { id } = await params;
    const program = await getProgramById(id);
    return NextResponse.json({ program });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "program.manage");
    const { id } = await params;
    const data = await parseBody(req, updateProgramSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const program = await updateProgram(user, id, data, ctx);
    return NextResponse.json({ program });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "program.manage");
    const { id } = await params;
    await deleteProgram(user, id, {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
