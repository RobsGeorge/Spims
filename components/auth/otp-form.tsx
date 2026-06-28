"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthFooter } from "@/components/auth/auth-footer";
import { OtpDigitInput } from "@/components/auth/otp-digit-input";
import { getAuthErrorMessage } from "@/lib/auth/client-errors";

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
  const [secondsLeft, setSecondsLeft] = useState(59);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

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
      const err = (await res.json()) as { code?: string; message?: string };
      setServerError(getAuthErrorMessage(t, err, "alert"));
    }
  }

  const otpError = !!serverError || !!errors.code;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError ? <AuthAlert variant="error">{serverError}</AuthAlert> : null}

      <Controller
        name="code"
        control={control}
        render={({ field }) => (
          <OtpDigitInput
            value={field.value}
            onChange={field.onChange}
            error={otpError}
            disabled={isSubmitting}
          />
        )}
      />

      {errors.code ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {t("auth.invalidOtp")}
        </p>
      ) : null}

      <Button type="submit" className="w-full rounded-full min-h-11 gap-2" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.confirmOtp")}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {secondsLeft > 0 ? (
          <>
            {t("auth.otpResendCountdown", { time: countdown })}
          </>
        ) : (
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setSecondsLeft(59)}
          >
            {t("auth.otpResendNow")}
          </button>
        )}
      </p>

      <AuthFooter>
        <Link
          href={`/${locale}/login`}
          className="inline-flex items-center justify-center gap-1 text-muted-foreground hover:text-primary"
        >
          {t("auth.backToSignIn")}
        </Link>
      </AuthFooter>
    </form>
  );
}
