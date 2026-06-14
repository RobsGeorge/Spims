import { z } from "zod";
import { RoleType, UserStatus } from "@prisma/client";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  preferredLocale: z.enum(["en", "ar", "fr"]).optional(),
  themePreference: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  roles: z.array(z.nativeEnum(RoleType)).min(1),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  roles: z.array(z.nativeEnum(RoleType)).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  isReviewer: z.boolean().optional(),
});
