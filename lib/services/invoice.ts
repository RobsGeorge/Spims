import { Currency, InvoiceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { withAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { resolveRegionalCurrency } from "@/lib/money";
import { resolveOfferingPricing } from "@/lib/services/offering";

export async function resolveEnrollmentInvoiceAmount(
  studentId: string,
  offeringId: string,
): Promise<{ amount: number; currency: Currency; description: string }> {
  const offering = await db.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: true },
  });
  if (!offering) throw AppError.notFound("Offering");

  const user = await db.user.findUnique({ where: { id: studentId } });
  const currency = resolveRegionalCurrency(user?.countryCode);
  const pricing = resolveOfferingPricing(offering, offering.course);
  const amount = currency === "EGP" ? pricing.priceEgp : pricing.priceUsd;
  const description = `${offering.course.code} — ${offering.course.title}`;
  return { amount, currency, description };
}

export async function createInvoiceForEnrollment(
  actor: SessionUser,
  enrollmentId: string,
  ctx?: { ip?: string; userAgent?: string; requestId?: string },
) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { offering: { include: { course: true } } },
  });
  if (!enrollment) throw AppError.notFound("Enrollment");

  const existing = await db.invoice.findUnique({ where: { enrollmentId } });
  if (existing) return existing;

  const { amount, currency, description } = await resolveEnrollmentInvoiceAmount(
    enrollment.studentId,
    enrollment.offeringId,
  );

  if (enrollment.offering.course.isFree || amount === 0) {
    return null;
  }

  return withAudit(
    {
      actor,
      action: "invoice.manage",
      entityType: "Invoice",
      ...ctx,
    },
    async (tx) =>
      tx.invoice.create({
        data: {
          studentId: enrollment.studentId,
          enrollmentId,
          currency,
          totalMinor: amount,
          status: InvoiceStatus.OPEN,
          lines: {
            create: {
              description,
              offeringId: enrollment.offeringId,
              amountMinor: amount,
            },
          },
        },
        include: { lines: true },
      }),
  );
}

export async function listInvoices(actor: SessionUser, opts: { studentId?: string } = {}) {
  const isFin =
    actor.roles.includes("FINANCIAL_ADMIN") || actor.roles.includes("SUPER_ADMIN");
  const where = isFin && opts.studentId ? { studentId: opts.studentId } : { studentId: actor.id };
  if (!isFin && opts.studentId && opts.studentId !== actor.id) {
    throw AppError.forbidden();
  }
  return db.invoice.findMany({
    where: isFin && !opts.studentId ? undefined : where,
    include: { lines: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoiceById(id: string, actor: SessionUser) {
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { lines: true, payments: true, batches: { include: { payments: true } } },
  });
  if (!invoice) throw AppError.notFound("Invoice");
  const isFin =
    actor.roles.includes("FINANCIAL_ADMIN") || actor.roles.includes("SUPER_ADMIN");
  if (!isFin && invoice.studentId !== actor.id) throw AppError.forbidden();
  return invoice;
}

export async function refreshInvoiceStatus(
  invoiceId: string,
  tx: { invoice: typeof db.invoice } = db,
) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return;

  const paid = invoice.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amountMinor, 0);

  let status: InvoiceStatus = InvoiceStatus.OPEN;
  if (paid >= invoice.totalMinor) status = InvoiceStatus.PAID;
  else if (paid > 0) status = InvoiceStatus.PARTIAL;

  await tx.invoice.update({ where: { id: invoiceId }, data: { status } });
  return status;
}

export async function getAmountDue(invoiceId: string): Promise<number> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) throw AppError.notFound("Invoice");
  const paid = invoice.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amountMinor, 0);
  return Math.max(0, invoice.totalMinor - paid);
}
