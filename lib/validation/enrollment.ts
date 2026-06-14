import { z } from "@/lib/validation";

export const enrollSchema = z.object({
  studentProgramId: z.string().optional(),
  acknowledgeScheduleConflict: z.boolean().optional().default(false),
});

export const enrollmentOverrideSchema = z.object({
  studentId: z.string().min(1),
  reason: z.string().min(1).max(500),
  studentProgramId: z.string().optional(),
});

export const waitlistPromoteSchema = z.object({
  count: z.number().int().positive().max(50).optional().default(1),
});

export type EnrollInput = z.infer<typeof enrollSchema>;
export type EnrollmentOverrideInput = z.infer<typeof enrollmentOverrideSchema>;
export type WaitlistPromoteInput = z.infer<typeof waitlistPromoteSchema>;
