import { z } from "@/lib/validation";
import { ComponentKind } from "@prisma/client";

export const componentSchema = z.object({
  name: z.string().min(1).max(120),
  weightPercent: z.number().min(0).max(100),
  kind: z.nativeEnum(ComponentKind),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().default(false),
  components: z.array(componentSchema).min(1),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isDefault: z.boolean().optional(),
  components: z.array(componentSchema).min(1).optional(),
});

export type CreateTemplateInput = z.output<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.output<typeof updateTemplateSchema>;
