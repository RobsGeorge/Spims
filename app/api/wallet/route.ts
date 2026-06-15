import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getWalletSummary } from "@/lib/services/wallet";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireSession();
    await authorize(user, "wallet.viewOwn");
    const wallet = await getWalletSummary(user.id);
    return NextResponse.json({ wallet });
  } catch (err) {
    return errorResponse(err);
  }
}
