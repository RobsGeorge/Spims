import {
  Currency,
  LedgerDirection,
  LedgerReason,
  PaymentMethod,
  WalletKind,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import { assertMinorUnits } from "@/lib/money";
import { AppError } from "@/lib/errors";

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export function balanceField(currency: Currency, kind: WalletKind): keyof {
  egpMoneyMinor: number;
  usdMoneyMinor: number;
  egpPointsMinor: number;
  usdPointsMinor: number;
} {
  if (kind === WalletKind.POINTS) {
    return currency === "EGP" ? "egpPointsMinor" : "usdPointsMinor";
  }
  return currency === "EGP" ? "egpMoneyMinor" : "usdMoneyMinor";
}

export async function ensureWallet(userId: string, tx?: TxClient) {
  const client = tx ?? db;
  return client.walletAccount.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getWalletSummary(userId: string) {
  const wallet = await ensureWallet(userId);
  const transactions = await db.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return {
    balances: {
      egpMoneyMinor: wallet.egpMoneyMinor,
      usdMoneyMinor: wallet.usdMoneyMinor,
      egpPointsMinor: wallet.egpPointsMinor,
      usdPointsMinor: wallet.usdPointsMinor,
    },
    transactions,
  };
}

async function applyLedger(
  tx: TxClient,
  opts: {
    userId: string;
    currency: Currency;
    kind: WalletKind;
    direction: LedgerDirection;
    amountMinor: number;
    reason: LedgerReason;
    note?: string;
    relatedPaymentId?: string;
    relatedInvoiceId?: string;
    createdById?: string;
  },
) {
  assertMinorUnits(opts.amountMinor);
  if (opts.amountMinor === 0) return ensureWallet(opts.userId, tx);

  const wallet = await ensureWallet(opts.userId, tx);
  const field = balanceField(opts.currency, opts.kind);

  if (opts.direction === LedgerDirection.DEBIT) {
    const current = wallet[field] as number;
    if (current < opts.amountMinor) {
      throw AppError.validation(`Insufficient ${opts.kind} balance in ${opts.currency}`);
    }
  }

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      currency: opts.currency,
      kind: opts.kind,
      direction: opts.direction,
      amountMinor: opts.amountMinor,
      reason: opts.reason,
      note: opts.note,
      relatedPaymentId: opts.relatedPaymentId,
      relatedInvoiceId: opts.relatedInvoiceId,
      createdById: opts.createdById,
    },
  });

  const delta = opts.direction === LedgerDirection.CREDIT ? opts.amountMinor : -opts.amountMinor;
  return tx.walletAccount.update({
    where: { id: wallet.id },
    data: { [field]: { increment: delta } },
  });
}

export async function creditWallet(opts: {
  userId: string;
  currency: Currency;
  kind?: WalletKind;
  amountMinor: number;
  reason: LedgerReason;
  note?: string;
  relatedInvoiceId?: string;
  relatedPaymentId?: string;
  createdById?: string;
}) {
  const kind = opts.kind ?? WalletKind.MONEY;
  return db.$transaction((tx) =>
    applyLedger(tx, {
      ...opts,
      kind,
      direction: LedgerDirection.CREDIT,
    }),
  );
}

export async function debitWallet(opts: {
  userId: string;
  currency: Currency;
  kind?: WalletKind;
  amountMinor: number;
  reason: LedgerReason;
  note?: string;
  relatedInvoiceId?: string;
  relatedPaymentId?: string;
  tx?: TxClient;
}) {
  const kind = opts.kind ?? WalletKind.MONEY;
  if (opts.tx) {
    return applyLedger(opts.tx, {
      ...opts,
      kind,
      direction: LedgerDirection.DEBIT,
    });
  }
  return db.$transaction((tx) =>
    applyLedger(tx, {
      ...opts,
      kind,
      direction: LedgerDirection.DEBIT,
    }),
  );
}

export async function grantPoints(opts: {
  userId: string;
  currency: Currency;
  amountMinor: number;
  createdById: string;
  note?: string;
}) {
  return creditWallet({
    userId: opts.userId,
    currency: opts.currency,
    kind: WalletKind.POINTS,
    amountMinor: opts.amountMinor,
    reason: LedgerReason.ADMIN_GRANT,
    note: opts.note,
    createdById: opts.createdById,
  });
}

export function walletMethodKind(method: PaymentMethod): WalletKind {
  return method === PaymentMethod.WALLET_POINTS ? WalletKind.POINTS : WalletKind.MONEY;
}

export async function hasFinancialHold(studentId: string): Promise<boolean> {
  const open = await db.invoice.count({
    where: { studentId, status: { in: ["OPEN", "PARTIAL"] } },
  });
  return open > 0;
}
