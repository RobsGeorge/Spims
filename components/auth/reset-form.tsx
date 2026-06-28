"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthFooter } from "@/components/auth/auth-footer";
import { OtpDigitInput } from "@/components/auth/otp-digit-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { getAuthErrorMessage } from "@/lib/auth/client-errors";

const requestSchema = z.object({ email: z.string().email() });
const confirmSchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6).regex(/^\d{6}$/),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "mismatch",
    path: ["confirmPassword"],
  });

type RequestData = z.infer<typeof requestSchema>;
type ConfirmData = z.infer<typeof confirmSchema>;

export function ResetRequestForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestData>({
    resolver: zodResolver(requestSchema),
  });

  async function onSubmit(data: RequestData) {
    await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEmail(data.email);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <AuthAlert variant="success">{t("auth.resetSuccess")}</AuthAlert>
        <ResetConfirmForm locale={locale} email={email} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <AuthField
        id="email"
        label={t("auth.emailAddress")}
        error={errors.email ? t("auth.validationEmail") : undefined}
      >
        <AuthInput
          id="email"
          type="email"
          icon={Mail}
          error={!!errors.email}
          placeholder="scholar@institution.edu"
          {...register("email")}
          autoComplete="email"
        />
      </AuthField>

      <Button type="submit" className="w-full rounded-full min-h-11 gap-2" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.resetPassword")}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>

      <AuthFooter>
        <Link
          href={`/${locale}/login`}
          className="inline-flex items-center justify-center gap-1 text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("auth.backToSignIn")}
        </Link>
      </AuthFooter>
    </form>
  );
}

function ResetConfirmForm({ locale, email }: { locale: string; email: string }) {
  const t = useTranslations();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { email, code: "" },
  });

  const newPassword = watch("newPassword", "");

  async function onSubmit(data: ConfirmData) {
    setServerError(null);
    const res = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const err = (await res.json()) as { code?: string; message?: string };
      setServerError(getAuthErrorMessage(t, err, "alert"));
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center sm:text-start">
        <AuthAlert variant="success">{t("auth.resetComplete")}</AuthAlert>
        <Button asChild className="w-full rounded-full min-h-11">
          <Link href={`/${locale}/login`}>{t("auth.login")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <input type="hidden" {...register("email")} />

      {serverError ? <AuthAlert variant="error">{serverError}</AuthAlert> : null}

      <AuthField id="code" label={t("auth.otpPrompt")} error={errors.code ? t("auth.invalidOtp") : undefined}>
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <OtpDigitInput
              value={field.value}
              onChange={field.onChange}
              error={!!errors.code || !!serverError}
              disabled={isSubmitting}
            />
          )}
        />
      </AuthField>

      <AuthField
        id="newPassword"
        label={t("auth.newPassword")}
        error={errors.newPassword ? t("auth.passwordMinLength") : undefined}
      >
        <AuthInput
          id="newPassword"
          type="password"
          icon={Lock}
          error={!!errors.newPassword}
          placeholder="••••••••"
          {...register("newPassword")}
          autoComplete="new-password"
        />
      </AuthField>

      <PasswordStrength password={newPassword} />

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

      <Button type="submit" className="w-full rounded-full min-h-11" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.resetConfirmTitle")}
      </Button>
    </form>
  );
}
