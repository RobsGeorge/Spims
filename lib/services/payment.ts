import {
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  WalletKind,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { initiateGatewayPayment, isOnlineGatewayMethod } from "@/lib/payments";
import { getAmountDue, getInvoiceById, refreshInvoiceStatus } from "@/lib/services/invoice";
import { enqueueReceiptJob } from "@/lib/services/receipt";
import {
  debitWallet,
  grantPoints,
  walletMethodKind,
} from "@/lib/services/wallet";
import type { ManualPaymentInput, PayInvoiceInput } from "@/lib/validation/payment";

async function completePayment(
  paymentId: string,
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
) {
  const payment = await tx.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.COMPLETED },
  });
  if (payment.invoiceId) {
    await refreshInvoiceStatus(payment.invoiceId, tx);
  }
  return payment;
}

export async function payInvoice(
  actor: SessionUser,
  invoiceId: string,
  input: PayInvoiceInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const invoice = await getInvoiceById(invoiceId, actor);
  if (invoice.studentId !== actor.id) throw AppError.forbidden();

  const existingBatch = await db.paymentBatch.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { payments: true },
  });
  if (existingBatch) {
    return { batch: existingBatch, payments: existingBatch.payments };
  }

  if (invoice.status === "PAID" || invoice.status === "VOID") {
    throw AppError.conflict("Invoice is not payable");
  }

  const due = await getAmountDue(invoiceId);
  const totalAlloc = input.allocations.reduce((s, a) => s + a.amountMinor, 0);
  if (totalAlloc !== due) {
    throw AppError.validation(`Allocations must equal amount due (${due})`);
  }

  const user = await db.user.findUnique({ where: { id: actor.id } });

  const result = await withAudit(
    {
      actor,
      action: "payment.self",
      entityType: "PaymentBatch",
      entityId: invoiceId,
      ...ctx,
    },
    async (tx) => {
      const batch = await tx.paymentBatch.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          invoiceId,
          studentId: actor.id,
          currency: invoice.currency,
          totalMinor: totalAlloc,
          status: PaymentStatus.PENDING,
        },
      });

      const payments = [];
      for (const alloc of input.allocations) {
        const payment = await tx.payment.create({
          data: {
            studentId: actor.id,
            invoiceId,
            batchId: batch.id,
            currency: invoice.currency,
            amountMinor: alloc.amountMinor,
            method: alloc.method,
            status: PaymentStatus.PENDING,
          },
        });

        if (
          alloc.method === PaymentMethod.WALLET_MONEY ||
          alloc.method === PaymentMethod.WALLET_POINTS
        ) {
          await debitWallet({
            userId: actor.id,
            currency: invoice.currency,
            kind: walletMethodKind(alloc.method),
            amountMinor: alloc.amountMinor,
            reason: "PAYMENT",
            relatedInvoiceId: invoiceId,
            relatedPaymentId: payment.id,
            tx,
          });
          payments.push(await completePayment(payment.id, tx));
        } else if (isOnlineGatewayMethod(alloc.method)) {
          const gw = await initiateGatewayPayment({
            method: alloc.method,
            amountMinor: alloc.amountMinor,
            currency: invoice.currency,
            reference: payment.id,
            countryCode: user?.countryCode,
          });
          await tx.payment.update({
            where: { id: payment.id },
            data: { gatewayRef: gw.gatewayRef },
          });
          if (gw.immediateComplete) {
            payments.push(await completePayment(payment.id, tx));
          } else {
            payments.push(await tx.payment.findUnique({ where: { id: payment.id } }));
          }
        } else {
          throw AppError.validation(`Unsupported payment method: ${alloc.method}`);
        }
      }

      const allComplete = payments.every((p) => p?.status === PaymentStatus.COMPLETED);
      await tx.paymentBatch.update({
        where: { id: batch.id },
        data: { status: allComplete ? PaymentStatus.COMPLETED : PaymentStatus.PENDING },
      });

      return { batch, payments };
    },
  );

  for (const p of result.payments) {
    if (p?.status === PaymentStatus.COMPLETED) {
      await enqueueReceiptJob(p.id);
    }
  }

  return result;
}

export async function recordManualPayment(
  actor: SessionUser,
  input: ManualPaymentInput,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const invoice = input.invoiceId
    ? await db.invoice.findUnique({ where: { id: input.invoiceId } })
    : null;
  if (input.invoiceId && !invoice) throw AppError.notFound("Invoice");

  return withAudit(
    {
      actor,
      action: "payment.manual",
      entityType: "Payment",
      ...ctx,
    },
    async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentId: input.studentId,
          invoiceId: input.invoiceId ?? null,
          currency: input.currency,
          amountMinor: input.amountMinor,
          method: input.method,
          status: PaymentStatus.PENDING_VERIFICATION,
          gatewayRef: input.reference,
          proofUrl: input.proofUrl ?? null,
          recordedById: actor.id,
        },
      });
      return payment;
    },
  );
}

export async function verifyManualPayment(
  actor: SessionUser,
  paymentId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw AppError.notFound("Payment");
  if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
    throw AppError.conflict("Payment is not pending verification");
  }

  const updated = await withAudit(
    {
      actor,
      action: "payment.manual",
      entityType: "Payment",
      entityId: paymentId,
      before: { status: payment.status },
      ...ctx,
    },
    async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.COMPLETED, verifiedById: actor.id },
      });
      if (p.invoiceId) await refreshInvoiceStatus(p.invoiceId, tx);
      return p;
    },
  );

  await enqueueReceiptJob(updated.id);
  return updated;
}

export async function getPaymentReceipt(paymentId: string, actor: SessionUser) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw AppError.notFound("Payment");
  const isFin =
    actor.roles.includes("FINANCIAL_ADMIN") || actor.roles.includes("SUPER_ADMIN");
  if (!isFin && payment.studentId !== actor.id) throw AppError.forbidden();
  if (!payment.receiptSerial) {
    const { finalizePaymentReceipt } = await import("@/lib/services/receipt");
    await finalizePaymentReceipt(paymentId);
    return db.payment.findUnique({ where: { id: paymentId } });
  }
  return payment;
}

export async function processWebhook(
  provider: string,
  eventId: string,
  payload: unknown,
  gatewayRef: string,
) {
  const existing = await db.webhookEvent.findUnique({
    where: { provider_eventId: { provider, eventId } },
  });
  if (existing) return { duplicate: true };

  await db.webhookEvent.create({
    data: { provider, eventId, payload: payload as object },
  });

  const payment = await db.payment.findFirst({
    where: { gatewayRef, status: PaymentStatus.PENDING },
  });
  if (!payment) return { processed: false };

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.COMPLETED },
    });
    if (payment.invoiceId) await refreshInvoiceStatus(payment.invoiceId, tx);
    if (payment.batchId) {
      await tx.paymentBatch.update({
        where: { id: payment.batchId },
        data: { status: PaymentStatus.COMPLETED },
      });
    }
  });

  await enqueueReceiptJob(payment.id);
  return { processed: true, paymentId: payment.id };
}

export { grantPoints };

export async function requestRefund(
  actor: SessionUser,
  input: { paymentId?: string; amountMinor: number; currency: "EGP" | "USD"; reason?: string },
) {
  return db.refund.create({
    data: {
      studentId: actor.id,
      paymentId: input.paymentId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      reason: input.reason,
      requestedById: actor.id,
      status: RefundStatus.REQUESTED,
    },
  });
}

export async function approveRefund(actor: SessionUser, refundId: string) {
  const refund = await db.refund.findUnique({ where: { id: refundId } });
  if (!refund) throw AppError.notFound("Refund");
  if (refund.status !== RefundStatus.REQUESTED) throw AppError.conflict("Refund not pending");

  await withAudit(
    { actor, action: "refund.manage", entityType: "Refund", entityId: refundId },
    async (tx) => {
      await tx.refund.update({
        where: { id: refundId },
        data: { status: RefundStatus.APPROVED, approvedById: actor.id },
      });
    },
  );

  const { creditWallet } = await import("@/lib/services/wallet");
  await creditWallet({
    userId: refund.studentId,
    currency: refund.currency,
    kind: refund.asPoints ? WalletKind.POINTS : WalletKind.MONEY,
    amountMinor: refund.amountMinor,
    reason: "REFUND",
    note: refund.reason ?? undefined,
    createdById: actor.id,
  });

  return db.refund.update({
    where: { id: refundId },
    data: { status: RefundStatus.COMPLETED },
  });
}

export async function createDonation(
  actor: SessionUser,
  input: {
    amountMinor: number;
    currency: "EGP" | "USD";
    kind: "MONEY" | "POINTS";
    designation?: string;
  },
) {
  await debitWallet({
    userId: actor.id,
    currency: input.currency,
    kind: input.kind === "POINTS" ? WalletKind.POINTS : WalletKind.MONEY,
    amountMinor: input.amountMinor,
    reason: "DONATION",
    note: input.designation,
  });

  return withAudit(
    { actor, action: "donation.make", entityType: "Donation" },
    async (tx) =>
      tx.donation.create({
        data: {
          userId: actor.id,
          amountMinor: input.amountMinor,
          currency: input.currency,
          kind: input.kind,
          designation: input.designation,
        },
      }),
  );
}
