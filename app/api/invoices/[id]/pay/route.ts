import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { payInvoiceSchema } from "@/lib/validation/payment";
import { payInvoice } from "@/lib/services/payment";
import { errorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "payment.self");
    const { id } = await params;
    const data = await parseBody(req, payInvoiceSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const result = await payInvoice(user, id, data, ctx);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
