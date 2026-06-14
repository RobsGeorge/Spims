import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { setPricingSchema } from "@/lib/validation/course";
import { setPricing } from "@/lib/services/course";
import { errorResponse } from "@/lib/errors";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "course.setPricing");
    const { id } = await params;
    const data = await parseBody(req, setPricingSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const course = await setPricing(user, id, data, ctx);
    return NextResponse.json({ course });
  } catch (err) {
    return errorResponse(err);
  }
}
