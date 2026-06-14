import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getApplicationPrefill } from "@/lib/services/application";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireSession();
    await authorize(user, "application.submit");
    const prefill = await getApplicationPrefill(user);
    return NextResponse.json({ prefill });
  } catch (err) {
    return errorResponse(err);
  }
}
