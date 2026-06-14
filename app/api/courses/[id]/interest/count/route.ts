import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getInterestCount } from "@/lib/services/course";
import { errorResponse } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    await authorize(user, "courseInterest.readCount");
    const { id } = await params;
    const result = await getInterestCount(id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
