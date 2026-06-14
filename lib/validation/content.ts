import { z } from "@/lib/validation";
import { ContentItemType } from "@prisma/client";

export const createWeekSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1).max(200),
  unlockDate: z.coerce.date().optional().nullable(),
  order: z.number().int().nonnegative().optional(),
});

export const createContentItemSchema = z.object({
  type: z.enum([ContentItemType.VIDEO, ContentItemType.READING, ContentItemType.TEXT]),
  title: z.string().min(1).max(200),
  order: z.number().int().nonnegative().optional(),
  vimeoId: z.string().optional(),
  fileUrl: z.string().min(1).optional(),
  body: z.string().optional(),
});

export const updateContentItemSchema = createContentItemSchema.partial().extend({
  title: z.string().min(1).max(200).optional(),
});

export type CreateWeekInput = z.infer<typeof createWeekSchema>;
export type CreateContentItemInput = z.infer<typeof createContentItemSchema>;
export type UpdateContentItemInput = z.infer<typeof updateContentItemSchema>;
