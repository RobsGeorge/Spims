import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  walletAccount: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  walletTransaction: { create: vi.fn(), findMany: vi.fn() },
  invoice: { count: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  balanceField,
  creditWallet,
  debitWallet,
  hasFinancialHold,
  walletMethodKind,
} from "@/lib/services/wallet";
import { PaymentMethod, WalletKind } from "@prisma/client";

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => unknown) => fn(mockDb));
  mockDb.walletAccount.upsert.mockResolvedValue({
    id: "w-1",
    egpMoneyMinor: 10000,
    usdMoneyMinor: 0,
    egpPointsMinor: 0,
    usdPointsMinor: 0,
  });
});

describe("wallet service", () => {
  it("balanceField maps currency and kind", () => {
    expect(balanceField("EGP", WalletKind.MONEY)).toBe("egpMoneyMinor");
    expect(balanceField("USD", WalletKind.POINTS)).toBe("usdPointsMinor");
  });

  it("walletMethodKind maps payment methods", () => {
    expect(walletMethodKind(PaymentMethod.WALLET_POINTS)).toBe(WalletKind.POINTS);
    expect(walletMethodKind(PaymentMethod.WALLET_MONEY)).toBe(WalletKind.MONEY);
  });

  it("hasFinancialHold is true for OPEN or PARTIAL invoices", async () => {
    mockDb.invoice.count.mockResolvedValue(1);
    expect(await hasFinancialHold("stu-1")).toBe(true);
    expect(mockDb.invoice.count).toHaveBeenCalledWith({
      where: { studentId: "stu-1", status: { in: ["OPEN", "PARTIAL"] } },
    });
  });

  it("debitWallet rejects insufficient balance", async () => {
    mockDb.walletAccount.upsert.mockResolvedValue({
      id: "w-1",
      egpMoneyMinor: 100,
      usdMoneyMinor: 0,
      egpPointsMinor: 0,
      usdPointsMinor: 0,
    });
    await expect(
      debitWallet({
        userId: "u-1",
        currency: "EGP",
        amountMinor: 500,
        reason: "PAYMENT",
      }),
    ).rejects.toThrow();
  });

  it("creditWallet creates ledger entry", async () => {
    mockDb.walletTransaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.walletAccount.update.mockResolvedValue({ id: "w-1" });
    await creditWallet({
      userId: "u-1",
      currency: "USD",
      amountMinor: 500,
      reason: "REFUND",
    });
    expect(mockDb.walletTransaction.create).toHaveBeenCalled();
    expect(mockDb.walletAccount.update).toHaveBeenCalled();
  });
});
