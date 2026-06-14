import { z } from "@/lib/validation";

export const bandSchema = z.object({
  letter: z.string().min(1).max(4),
  minPercent: z.number().min(0).max(100),
  maxPercent: z.number().min(0).max(100),
  gpaPoints: z.number().min(0),
  isPassing: z.boolean(),
});

export const createGradingSchemeSchema = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().optional().default(false),
  bands: z.array(bandSchema).min(1),
});

export const updateGradingSchemeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
  bands: z.array(bandSchema).min(1).optional(),
});

export type CreateGradingSchemeInput = z.infer<typeof createGradingSchemeSchema>;
export type UpdateGradingSchemeInput = z.infer<typeof updateGradingSchemeSchema>;
