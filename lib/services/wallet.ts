import { Currency, LedgerDirection, LedgerReason, WalletKind } from "@prisma/client";
import { db } from "@/lib/db";
import { assertMinorUnits } from "@/lib/money";

export async function ensureWallet(userId: string) {
  return db.walletAccount.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function creditWallet(opts: {
  userId: string;
  currency: Currency;
  amountMinor: number;
  reason: LedgerReason;
  note?: string;
  relatedInvoiceId?: string;
  createdById?: string;
}) {
  assertMinorUnits(opts.amountMinor);
  if (opts.amountMinor === 0) return ensureWallet(opts.userId);

  const wallet = await ensureWallet(opts.userId);
  const field =
    opts.currency === "EGP" ? "egpMoneyMinor" : "usdMoneyMinor";

  return db.$transaction(async (tx) => {
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        currency: opts.currency,
        kind: WalletKind.MONEY,
        direction: LedgerDirection.CREDIT,
        amountMinor: opts.amountMinor,
        reason: opts.reason,
        note: opts.note,
        relatedInvoiceId: opts.relatedInvoiceId,
        createdById: opts.createdById,
      },
    });
    return tx.walletAccount.update({
      where: { id: wallet.id },
      data: { [field]: { increment: opts.amountMinor } },
    });
  });
}

export async function hasFinancialHold(studentId: string): Promise<boolean> {
  const open = await db.invoice.count({
    where: { studentId, status: "OPEN" },
  });
  return open > 0;
}
