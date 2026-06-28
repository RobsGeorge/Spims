"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthAlert } from "@/components/auth/auth-alert";
import { PasswordStrength } from "@/components/auth/password-strength";
import { getAuthErrorMessage } from "@/lib/auth/client-errors";

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "mismatch",
    path: ["confirmPassword"],
  });
type FormData = z.infer<typeof schema>;

export function SetPasswordForm({ locale, userId }: { locale: string; userId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch("password", "");

  async function onSubmit({ password, confirmPassword }: FormData) {
    setServerError(null);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password, confirmPassword }),
    });
    if (res.ok) {
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } else {
      const err = (await res.json()) as { code?: string; message?: string };
      setServerError(getAuthErrorMessage(t, err, "alert"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError ? <AuthAlert variant="error">{serverError}</AuthAlert> : null}

      <AuthField
        id="password"
        label={t("auth.newPassword")}
        error={errors.password ? t("auth.passwordMinLength") : undefined}
      >
        <AuthInput
          id="password"
          type="password"
          icon={Lock}
          error={!!errors.password}
          placeholder="••••••••"
          {...register("password")}
          autoComplete="new-password"
        />
      </AuthField>

      <PasswordStrength password={password} />

      <AuthField
        id="confirmPassword"
        label={t("auth.confirmPassword")}
        error={errors.confirmPassword ? t("auth.passwordMismatch") : undefined}
      >
        <AuthInput
          id="confirmPassword"
          type="password"
          icon={Lock}
          error={!!errors.confirmPassword}
          placeholder="••••••••"
          {...register("confirmPassword")}
          autoComplete="new-password"
        />
      </AuthField>

      <Button type="submit" className="w-full rounded-full min-h-11 gap-2" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.setPasswordTitle")}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>
    </form>
  );
}
