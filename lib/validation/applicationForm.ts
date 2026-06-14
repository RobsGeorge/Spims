import { z } from "@/lib/validation";
import { FormFieldType } from "@prisma/client";

const fieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(200),
  type: z.nativeEnum(FormFieldType),
  required: z.boolean().optional().default(false),
  order: z.number().int().nonnegative(),
  options: z.array(z.string()).optional().default([]),
  allowedFileTypes: z.array(z.string()).optional().default([]),
  adminNote: z.string().optional().nullable(),
});

export const upsertApplicationFormSchema = z.object({
  name: z.string().min(1).max(200),
  active: z.boolean().optional().default(true),
  fields: z.array(fieldSchema),
});

export type UpsertApplicationFormInput = z.infer<typeof upsertApplicationFormSchema>;
