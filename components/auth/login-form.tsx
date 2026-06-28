"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthFooter } from "@/components/auth/auth-footer";
import { getAuthErrorMessage } from "@/lib/auth/client-errors";

const REMEMBER_KEY = "spims_remember_email";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { remember: false },
  });

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setValue("email", saved);
      setValue("remember", true);
    }
  }, [setValue]);

  async function onSubmit(data: FormData) {
    setServerError(null);
    setAuthFailed(false);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });
    if (res.ok) {
      if (data.remember) localStorage.setItem(REMEMBER_KEY, data.email);
      else localStorage.removeItem(REMEMBER_KEY);
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } else {
      const err = (await res.json()) as { code?: string; message?: string };
      setServerError(getAuthErrorMessage(t, err, "alert"));
      setAuthFailed(true);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError ? <AuthAlert variant="error">{serverError}</AuthAlert> : null}

      <AuthField
        id="email"
        label={t("auth.emailAddress")}
        error={errors.email ? t("auth.validationEmail") : undefined}
      >
        <AuthInput
          id="email"
          type="email"
          icon={Mail}
          error={authFailed || !!errors.email}
          placeholder="scholar@institution.edu"
          {...register("email")}
          autoComplete="email"
        />
      </AuthField>

      <AuthField id="password" label={t("auth.password")} error={errors.password ? t("auth.validationRequired") : undefined}>
        <AuthInput
          id="password"
          type="password"
          icon={Lock}
          error={authFailed || !!errors.password}
          placeholder="••••••••"
          {...register("password")}
          autoComplete="current-password"
        />
      </AuthField>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            {...register("remember")}
          />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
            {t("auth.rememberMe")}
          </Label>
        </div>
        <Link
          href={`/${locale}/reset`}
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("auth.forgotPassword")}
        </Link>
      </div>

      <Button type="submit" className="w-full rounded-full min-h-11 gap-2" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.login")}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>

      <AuthFooter>
        <p>
          {t("auth.loginSubtitle")}{" "}
          <Link href={`/${locale}/register`} className="font-semibold text-primary hover:underline">
            {t("auth.register")}
          </Link>
        </p>
        <Link href={`/${locale}/reset`} className="text-muted-foreground hover:text-primary">
          {t("auth.resetAccount")}
        </Link>
      </AuthFooter>
    </form>
  );
}
