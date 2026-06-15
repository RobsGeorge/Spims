import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { refundRequestSchema } from "@/lib/validation/payment";
import { approveRefund, requestRefund } from "@/lib/services/payment";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const approveId = req.nextUrl.searchParams.get("approve");
    if (approveId) {
      await authorize(user, "refund.manage");
      const refund = await approveRefund(user, approveId);
      return NextResponse.json({ refund });
    }
    await authorize(user, "refund.request");
    const data = await parseBody(req, refundRequestSchema);
    const refund = await requestRefund(user, data);
    return NextResponse.json({ refund }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
