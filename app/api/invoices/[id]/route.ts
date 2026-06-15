import { NextRequest, NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { getInvoiceById } from "@/lib/services/invoice";
import { errorResponse } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const isFin =
      user.roles.includes(RoleType.FINANCIAL_ADMIN) ||
      user.roles.includes(RoleType.SUPER_ADMIN);
    await authorize(user, isFin ? "invoice.manage" : "invoice.viewOwn");
    const { id } = await params;
    const invoice = await getInvoiceById(id, user);
    return NextResponse.json({ invoice });
  } catch (err) {
    return errorResponse(err);
  }
}
