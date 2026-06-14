"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormData = z.infer<typeof schema>;

export function SetPasswordForm({ locale, userId }: { locale: string; userId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ password, confirmPassword }: FormData) {
    setServerError(null);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password, confirmPassword }),
    });
    if (res.ok) {
      router.push(`/${locale}/dashboard`);
    } else {
      const err = await res.json() as { message?: string };
      setServerError(err.message ?? t("common.error"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input id="password" type="password" {...register("password")} autoComplete="new-password" />
        {errors.password && <p className="text-xs text-destructive">{t("auth.passwordMinLength")}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} autoComplete="new-password" />
        {errors.confirmPassword && <p className="text-xs text-destructive">{t("auth.passwordMismatch")}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.setPasswordTitle")}
      </Button>
    </form>
  );
}
