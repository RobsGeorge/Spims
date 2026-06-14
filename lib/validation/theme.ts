import { z } from "zod";

const tokenSchema = z.record(z.string(), z.string());

export const createThemeSchema = z.object({
  name: z.string().min(1).max(100),
  siteName: z.string().min(1).max(100),
  logoLightUrl: z.string().url().nullable().optional(),
  logoDarkUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  tokens: tokenSchema,
});

export const updateThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  siteName: z.string().min(1).max(100).optional(),
  logoLightUrl: z.string().url().nullable().optional(),
  logoDarkUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  tokens: tokenSchema.optional(),
  isActive: z.boolean().optional(),
});
