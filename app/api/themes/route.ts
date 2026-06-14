import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { createThemeSchema } from "@/lib/validation/theme";
import { listThemes, createTheme } from "@/lib/services/theme";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireSession();
    await authorize(user, "branding.read");
    const themes = await listThemes();
    return NextResponse.json({ themes });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "branding.manage");
    const data = await parseBody(req, createThemeSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const theme = await createTheme(user, data, ctx);
    return NextResponse.json({ theme }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
