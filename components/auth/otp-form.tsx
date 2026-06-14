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

const schema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});
type FormData = z.infer<typeof schema>;

interface Props {
  locale: string;
  userId: string;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  redirectTo: string;
}

export function OtpForm({ locale, userId, purpose, redirectTo }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ code }: FormData) {
    setServerError(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code, purpose }),
    });
    if (res.ok) {
      router.push(redirectTo);
    } else {
      const err = await res.json() as { message?: string };
      setServerError(err.message ?? t("auth.invalidOtp"));
    }
  }

  void locale;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">{t("auth.otpPrompt")}</Label>
        <Input
          id="code"
          {...register("code")}
          maxLength={6}
          inputMode="numeric"
          pattern="\d{6}"
          autoComplete="one-time-code"
          className="text-center text-xl tracking-widest"
        />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.confirmOtp")}
      </Button>
    </form>
  );
}
