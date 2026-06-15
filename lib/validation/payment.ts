import { z } from "@/lib/validation";
import { Currency, PaymentMethod } from "@prisma/client";

const allocationSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amountMinor: z.number().int().nonnegative(),
});

export const payInvoiceSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
  allocations: z.array(allocationSchema).min(1),
});

export const manualPaymentSchema = z.object({
  studentId: z.string().min(1),
  invoiceId: z.string().optional(),
  currency: z.nativeEnum(Currency),
  amountMinor: z.number().int().positive(),
  method: z.enum(["MANUAL_CASH", "MANUAL_TRANSFER", "MANUAL_CHEQUE"]),
  reference: z.string().min(1).max(200),
  proofUrl: z.string().url().optional().nullable(),
});

export const refundRequestSchema = z.object({
  paymentId: z.string().optional(),
  amountMinor: z.number().int().positive(),
  currency: z.nativeEnum(Currency),
  reason: z.string().max(500).optional(),
});

export const donationSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.nativeEnum(Currency),
  kind: z.enum(["MONEY", "POINTS"]).default("MONEY"),
  designation: z.string().max(200).optional(),
});

export const grantPointsSchema = z.object({
  userId: z.string().min(1),
  currency: z.nativeEnum(Currency),
  amountMinor: z.number().int().positive(),
  note: z.string().max(200).optional(),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;
