"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const requestSchema = z.object({ email: z.string().email() });
const confirmSchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6).regex(/^\d{6}$/),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RequestData = z.infer<typeof requestSchema>;
type ConfirmData = z.infer<typeof confirmSchema>;

export function ResetRequestForm() {
  const t = useTranslations();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RequestData>({
    resolver: zodResolver(requestSchema),
  });

  async function onSubmit(data: RequestData) {
    await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    // Always show success (don't reveal user existence)
    setEmail(data.email);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("auth.resetSuccess")}</p>
        <ResetConfirmForm email={email} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input id="email" type="email" {...register("email")} autoComplete="email" />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.resetPassword")}
      </Button>
    </form>
  );
}

function ResetConfirmForm({ email }: { email: string }) {
  const t = useTranslations();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ConfirmData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { email },
  });

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
      const err = await res.json() as { message?: string };
      setServerError(err.message ?? t("auth.invalidOtp"));
    }
  }

  if (done) {
    return <p className="text-sm text-green-600">{t("auth.loggedOut")}</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("email")} />

      <div className="space-y-1.5">
        <Label htmlFor="code">{t("auth.otpPrompt")}</Label>
        <Input id="code" {...register("code")} maxLength={6} inputMode="numeric" className="text-center text-xl tracking-widest" />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
        <Input id="newPassword" type="password" {...register("newPassword")} autoComplete="new-password" />
        {errors.newPassword && <p className="text-xs text-destructive">{t("auth.passwordMinLength")}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} autoComplete="new-password" />
        {errors.confirmPassword && <p className="text-xs text-destructive">{t("auth.passwordMismatch")}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.resetConfirmTitle")}
      </Button>
    </form>
  );
}
