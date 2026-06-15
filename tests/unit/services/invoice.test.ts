import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = vi.hoisted(() => ({
  invoice: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  user: { findUnique: vi.fn() },
  enrollment: { findUnique: vi.fn() },
  courseOffering: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({
  withAudit: vi.fn(async (_ctx: unknown, mutation: (tx: typeof mockDb) => Promise<unknown>) =>
    mutation(mockDb),
  ),
}));
vi.mock("@/lib/services/offering", () => ({
  resolveOfferingPricing: vi.fn(() => ({ priceEgp: 50000, priceUsd: 10000 })),
}));

import {
  getAmountDue,
  refreshInvoiceStatus,
  resolveEnrollmentInvoiceAmount,
} from "@/lib/services/invoice";

beforeEach(() => vi.clearAllMocks());

describe("invoice service", () => {
  it("resolveEnrollmentInvoiceAmount uses EGP for Egypt", async () => {
    mockDb.courseOffering.findUnique.mockResolvedValue({
      id: "off-1",
      course: { code: "CS101", title: "Intro" },
    });
    mockDb.user.findUnique.mockResolvedValue({ countryCode: "EG" });

    const result = await resolveEnrollmentInvoiceAmount("stu-1", "off-1");
    expect(result.currency).toBe("EGP");
    expect(result.amount).toBe(50000);
  });

  it("getAmountDue subtracts completed payments", async () => {
    mockDb.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      totalMinor: 10000,
      payments: [
        { status: "COMPLETED", amountMinor: 3000 },
        { status: "PENDING", amountMinor: 2000 },
      ],
    });
    expect(await getAmountDue("inv-1")).toBe(7000);
  });

  it("refreshInvoiceStatus sets PARTIAL when partially paid", async () => {
    mockDb.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      totalMinor: 10000,
      payments: [{ status: "COMPLETED", amountMinor: 4000 }],
    });
    mockDb.invoice.update.mockResolvedValue({});
    const status = await refreshInvoiceStatus("inv-1");
    expect(status).toBe("PARTIAL");
    expect(mockDb.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "PARTIAL" },
    });
  });
});
