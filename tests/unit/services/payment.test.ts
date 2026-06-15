import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  paymentBatch: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  payment: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
  webhookEvent: { findUnique: vi.fn(), create: vi.fn() },
  invoice: { findUnique: vi.fn(), update: vi.fn() },
  refund: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  donation: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));
vi.mock("@/lib/services/invoice", () => ({
  getInvoiceById: vi.fn(),
  getAmountDue: vi.fn(),
  refreshInvoiceStatus: vi.fn(),
}));
vi.mock("@/lib/services/wallet", () => ({
  debitWallet: vi.fn(),
  creditWallet: vi.fn(),
  walletMethodKind: vi.fn(() => "MONEY"),
}));
vi.mock("@/lib/payments", () => ({
  initiateGatewayPayment: vi.fn(async () => ({ gatewayRef: "mock-ref", immediateComplete: true })),
  isOnlineGatewayMethod: vi.fn((m: string) => ["PAYPAL", "PAYMOB", "CASHIER"].includes(m)),
}));
vi.mock("@/lib/services/receipt", () => ({
  enqueueReceiptJob: vi.fn(),
}));

import { getInvoiceById, getAmountDue } from "@/lib/services/invoice";
import { debitWallet } from "@/lib/services/wallet";
import { initiateGatewayPayment } from "@/lib/payments";
import { enqueueReceiptJob } from "@/lib/services/receipt";
import { payInvoice, processWebhook } from "@/lib/services/payment";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

const STUDENT = {
  id: "stu-1",
  email: "s@test.com",
  firstName: "Stu",
  lastName: "Dent",
  roles: ["STUDENT" as const],
  preferredLocale: "en",
  countryCode: null,
};

beforeEach(() => vi.clearAllMocks());

describe("payment service", () => {
  it("payInvoice returns existing batch for duplicate idempotency key", async () => {
    vi.mocked(getInvoiceById).mockResolvedValue({
      id: "inv-1",
      studentId: "stu-1",
      status: "OPEN",
      currency: "USD",
      totalMinor: 10000,
    } as never);
    mockDb.paymentBatch.findUnique.mockResolvedValue({
      id: "batch-1",
      payments: [{ id: "pay-1" }],
    });

    const result = await payInvoice(STUDENT, "inv-1", {
      idempotencyKey: "idem-1",
      allocations: [{ method: PaymentMethod.WALLET_MONEY, amountMinor: 10000 }],
    });
    expect(result.batch.id).toBe("batch-1");
    expect(mockDb.paymentBatch.create).not.toHaveBeenCalled();
  });

  it("payInvoice debits wallet and completes payment", async () => {
    vi.mocked(getInvoiceById).mockResolvedValue({
      id: "inv-1",
      studentId: "stu-1",
      status: "OPEN",
      currency: "USD",
      totalMinor: 5000,
    } as never);
    vi.mocked(getAmountDue).mockResolvedValue(5000);
    mockDb.paymentBatch.findUnique.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue({ countryCode: "US" });
    mockDb.paymentBatch.create.mockResolvedValue({ id: "batch-1" });
    mockDb.payment.create.mockResolvedValue({ id: "pay-1", status: PaymentStatus.PENDING, invoiceId: "inv-1" });
    mockDb.payment.update.mockResolvedValue({ id: "pay-1", status: PaymentStatus.COMPLETED, invoiceId: "inv-1" });
    mockDb.payment.findUnique.mockResolvedValue({ id: "pay-1", status: PaymentStatus.COMPLETED, invoiceId: "inv-1" });
    mockDb.paymentBatch.update.mockResolvedValue({});

    await payInvoice(STUDENT, "inv-1", {
      idempotencyKey: "idem-2",
      allocations: [{ method: PaymentMethod.WALLET_MONEY, amountMinor: 5000 }],
    });
    expect(debitWallet).toHaveBeenCalled();
  });

  it("payInvoice marks batch COMPLETED and enqueues receipt for immediate gateway pay", async () => {
    vi.mocked(getInvoiceById).mockResolvedValue({
      id: "inv-1",
      studentId: "stu-1",
      status: "OPEN",
      currency: "USD",
      totalMinor: 5000,
    } as never);
    vi.mocked(getAmountDue).mockResolvedValue(5000);
    vi.mocked(initiateGatewayPayment).mockResolvedValue({
      gatewayRef: "mock-ref",
      immediateComplete: true,
    });
    mockDb.paymentBatch.findUnique.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue({ countryCode: "US" });
    mockDb.paymentBatch.create.mockResolvedValue({ id: "batch-1" });
    mockDb.payment.create.mockResolvedValue({
      id: "pay-gw-1",
      status: PaymentStatus.PENDING,
      invoiceId: "inv-1",
    });
    mockDb.payment.update.mockResolvedValue({
      id: "pay-gw-1",
      status: PaymentStatus.COMPLETED,
      invoiceId: "inv-1",
      gatewayRef: "mock-ref",
    });
    mockDb.paymentBatch.update.mockResolvedValue({});

    await payInvoice(STUDENT, "inv-1", {
      idempotencyKey: "idem-gw",
      allocations: [{ method: PaymentMethod.PAYPAL, amountMinor: 5000 }],
    });

    expect(mockDb.paymentBatch.update).toHaveBeenCalledWith({
      where: { id: "batch-1" },
      data: { status: PaymentStatus.COMPLETED },
    });
    expect(enqueueReceiptJob).toHaveBeenCalledWith("pay-gw-1");
  });

  it("processWebhook is idempotent for duplicate events", async () => {
    mockDb.webhookEvent.findUnique.mockResolvedValue({ id: "evt-1" });
    const result = await processWebhook("paypal", "evt-1", {}, "ref-1");
    expect(result).toEqual({ duplicate: true });
    expect(mockDb.webhookEvent.create).not.toHaveBeenCalled();
  });
});
