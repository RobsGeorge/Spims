import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { enrollSchema } from "@/lib/validation/enrollment";
import { enrollStudent } from "@/lib/services/enrollment";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "enrollment.self");
    const { id } = await params;
    const data = await parseBody(req, enrollSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const enrollment = await enrollStudent(user, id, data, {}, ctx);
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
