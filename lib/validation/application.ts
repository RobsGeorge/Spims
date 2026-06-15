import { z } from "@/lib/validation";
import { ApplicationStatus } from "@prisma/client";

const valueSchema = z.object({
  fieldId: z.string().min(1),
  value: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
});

export const submitApplicationSchema = z.object({
  programId: z.string().min(1),
  values: z.array(valueSchema),
});

export const updateApplicationSchema = z.object({
  values: z.array(valueSchema).optional(),
});

export const applicationDecisionSchema = z.object({
  decision: z.enum([
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WAITLISTED,
  ]),
  decisionNote: z.string().optional(),
});

export const reassignReviewerSchema = z.object({
  reviewerId: z.string().min(1),
});

export const applicationUploadUrlSchema = z.object({
  programId: z.string().min(1),
  fieldId: z.string().min(1),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type ApplicationUploadUrlInput = z.infer<typeof applicationUploadUrlSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionSchema>;
export type ReassignReviewerInput = z.infer<typeof reassignReviewerSchema>;
