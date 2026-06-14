import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { setOfferingPricingSchema } from "@/lib/validation/offering";
import { setOfferingPricing } from "@/lib/services/offering";
import { errorResponse } from "@/lib/errors";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    await authorize(user, "offering.setPricing");
    const { id } = await params;
    const data = await parseBody(req, setOfferingPricingSchema);
    const ctx = {
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      requestId: req.headers.get("x-request-id") ?? undefined,
    };
    const offering = await setOfferingPricing(user, id, data, ctx);
    return NextResponse.json({ offering });
  } catch (err) {
    return errorResponse(err);
  }
}
