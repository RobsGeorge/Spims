import { z } from "@/lib/validation";
import { OfferingStatus } from "@prisma/client";

export const createSemesterSchema = z.object({
  academicYearId: z.string().min(1),
  name: z.string().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationStart: z.coerce.date(),
  registrationEnd: z.coerce.date(),
  addDropEndWeek: z.number().int().positive(),
  lastWithdrawalWeek: z.number().int().positive(),
  withdrawalRefundPercent: z.number().min(0).max(100).optional().default(0),
  status: z.nativeEnum(OfferingStatus).optional().default(OfferingStatus.DRAFT),
});

export const updateSemesterSchema = createSemesterSchema.partial().omit({ academicYearId: true });

export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;
export type UpdateSemesterInput = z.infer<typeof updateSemesterSchema>;
