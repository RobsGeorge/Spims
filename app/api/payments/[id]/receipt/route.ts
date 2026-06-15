import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getPaymentReceipt } from "@/lib/services/payment";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "payment.self");
    const { id } = await params;
    const payment = await getPaymentReceipt(id, user);
    return NextResponse.json({ payment });
  } catch (err) {
    return errorResponse(err);
  }
}
