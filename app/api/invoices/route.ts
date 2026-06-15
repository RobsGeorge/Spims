import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listInvoices } from "@/lib/services/invoice";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const isFin =
      user.roles.includes(RoleType.FINANCIAL_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    if (isFin) {
      await authorize(user, "invoice.manage");
    } else {
      await authorize(user, "invoice.viewOwn");
    }
    const studentId = req.nextUrl.searchParams.get("studentId") ?? undefined;
    const invoices = await listInvoices(user, { studentId });
    return NextResponse.json({ invoices });
  } catch (err) {
    return errorResponse(err);
  }
}
