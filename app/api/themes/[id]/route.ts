import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { updateThemeSchema } from "@/lib/validation/theme";
import { updateTheme, deleteTheme } from "@/lib/services/theme";
import { errorResponse } from "@/lib/errors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    await authorize(user, "branding.manage");
    const data = await parseBody(req, updateThemeSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const theme = await updateTheme(user, id, data, ctx);
    return NextResponse.json({ theme });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    await authorize(user, "branding.manage");
    await deleteTheme(user, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
