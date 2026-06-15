import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { manualPaymentSchema } from "@/lib/validation/payment";
import { recordManualPayment } from "@/lib/services/payment";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "payment.manual");
    const data = await parseBody(req, manualPaymentSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const payment = await recordManualPayment(user, data, ctx);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
