import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateUserSchema } from "@/lib/validation/user";
import { getUserById, updateUser } from "@/lib/services/user";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireSession();
    await authorize(actor, "user.manage");
    const user = await getUserById(id);
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requireSession();
    await authorize(actor, "user.manage");
    const data = await parseBody(req, updateUserSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const updated = await updateUser(actor, id, data, ctx);
    return NextResponse.json({ user: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
