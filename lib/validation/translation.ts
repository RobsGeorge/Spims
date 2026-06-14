import { z } from "@/lib/validation";

const SUPPORTED_LOCALES = ["en", "ar", "fr"] as const;

export const upsertTranslationSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  field: z.string().min(1),
  locale: z.enum(SUPPORTED_LOCALES),
  value: z.string().min(1),
});

export const verifyTranslationSchema = z.object({
  translationId: z.string().min(1),
});

export const triggerAiTranslationSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  field: z.string().min(1),
  locale: z.enum(SUPPORTED_LOCALES),
});

export type UpsertTranslationInput = z.infer<typeof upsertTranslationSchema>;
export type VerifyTranslationInput = z.infer<typeof verifyTranslationSchema>;
export type TriggerAiTranslationInput = z.infer<typeof triggerAiTranslationSchema>;
