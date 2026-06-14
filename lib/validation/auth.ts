import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});

export const verifyOtpSchema = z.object({
  userId: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
  purpose: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]),
});

export const setPasswordSchema = z
  .object({
    userId: z.string().min(1),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6).regex(/^\d{6}$/),
    newPassword: z.string().min(8).max(128),
  });
