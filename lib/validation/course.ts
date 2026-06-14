import { z } from "@/lib/validation";

export const createCourseSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  title: z.string().min(1).max(200),
  creditHours: z.number().int().positive(),
  isFree: z.boolean().optional().default(false),
  isStandalone: z.boolean().optional().default(false),
  passingThreshold: z.number().min(0).max(100).optional(),
  assessmentTemplateId: z.string().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const setPrerequisitesSchema = z.object({
  prerequisiteIds: z.array(z.string()).default([]),
});

export const setPricingSchema = z.object({
  defaultPriceUsd: z.number().int().nonnegative(),
  defaultPriceEgp: z.number().int().nonnegative(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type SetPrerequisitesInput = z.infer<typeof setPrerequisitesSchema>;
export type SetPricingInput = z.infer<typeof setPricingSchema>;
