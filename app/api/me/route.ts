import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateProfileSchema } from "@/lib/validation/user";
import { getMe, updateMe } from "@/lib/services/user";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireSession();
    await authorize(user, "profile.viewOwn");
    const profile = await getMe(user.id);
    return NextResponse.json({ user: profile });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "profile.editOwn");
    const data = await parseBody(req, updateProfileSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const updated = await updateMe(user, data, ctx);
    return NextResponse.json({ user: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
