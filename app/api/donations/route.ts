import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { parseBody } from "@/lib/validation";
import { donationSchema } from "@/lib/validation/payment";
import { createDonation } from "@/lib/services/payment";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { RoleType } from "@prisma/client";

export async function GET() {
  try {
    const user = await requireSession();
    const isFin =
      user.roles.includes(RoleType.FINANCIAL_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    if (isFin) {
      await authorize(user, "donation.manage");
      const donations = await db.donation.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
      return NextResponse.json({ donations });
    }
    await authorize(user, "donation.make");
    const donations = await db.donation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ donations });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    await authorize(user, "donation.make");
    const data = await parseBody(req, donationSchema);
    const donation = await createDonation(user, {
      amountMinor: data.amountMinor,
      currency: data.currency,
      kind: data.kind ?? "MONEY",
      designation: data.designation,
    });
    return NextResponse.json({ donation }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
