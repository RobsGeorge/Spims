import { z } from "@/lib/validation";
import { OfferingMode, OfferingStaffRole, OfferingStatus } from "@prisma/client";

export const createOfferingSchema = z.object({
  courseId: z.string().min(1),
  mode: z.nativeEnum(OfferingMode).optional().default(OfferingMode.COHORT),
  semesterId: z.string().optional(),
  seatCapacity: z.number().int().positive().optional(),
  attendanceThresholdPercent: z.number().min(0).max(100).optional().default(60),
  status: z.nativeEnum(OfferingStatus).optional().default(OfferingStatus.DRAFT),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateOfferingSchema = createOfferingSchema.partial().omit({ courseId: true });

export const cloneOfferingSchema = z.object({
  sourceOfferingId: z.string().min(1),
});

export const setOfferingStaffSchema = z.object({
  staff: z.array(
    z.object({
      userId: z.string().min(1),
      role: z.nativeEnum(OfferingStaffRole),
    }),
  ),
});

export const setOfferingPricingSchema = z.object({
  priceUsdOverride: z.number().int().nonnegative().nullable(),
  priceEgpOverride: z.number().int().nonnegative().nullable(),
});

export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
export type CloneOfferingInput = z.infer<typeof cloneOfferingSchema>;
export type SetOfferingStaffInput = z.infer<typeof setOfferingStaffSchema>;
export type SetOfferingPricingInput = z.infer<typeof setOfferingPricingSchema>;
