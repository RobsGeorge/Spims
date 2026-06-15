import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { grantPointsSchema } from "@/lib/validation/payment";
import { grantPoints } from "@/lib/services/wallet";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "wallet.manage");
    const data = await parseBody(req, grantPointsSchema);
    const wallet = await grantPoints({
      userId: data.userId,
      currency: data.currency,
      amountMinor: data.amountMinor,
      createdById: user.id,
      note: data.note,
    });
    return NextResponse.json({ wallet });
  } catch (err) {
    return errorResponse(err);
  }
}
