"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthFooter } from "@/components/auth/auth-footer";
import { getAuthErrorMessage } from "@/lib/auth/client-errors";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const inputClassName =
  "min-h-11 rounded-2xl border-border/50 bg-background focus-visible:bg-background";

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { id } = (await res.json()) as { id: string };
      router.push(`/${locale}/verify-otp?userId=${id}&purpose=EMAIL_VERIFICATION`);
    } else {
      const err = (await res.json()) as { code?: string; message?: string };
      setServerError(getAuthErrorMessage(t, err, "alert"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError ? <AuthAlert variant="error">{serverError}</AuthAlert> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <AuthField
          id="firstName"
          label={t("auth.firstName")}
          error={errors.firstName ? t("auth.validationRequired") : undefined}
        >
          <Input id="firstName" className={inputClassName} {...register("firstName")} autoComplete="given-name" />
        </AuthField>
        <AuthField
          id="lastName"
          label={t("auth.lastName")}
          error={errors.lastName ? t("auth.validationRequired") : undefined}
        >
          <Input id="lastName" className={inputClassName} {...register("lastName")} autoComplete="family-name" />
        </AuthField>
      </div>

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
          placeholder="john.doe@example.com"
          {...register("email")}
          autoComplete="email"
        />
      </AuthField>

      <AuthField id="phone" label={t("auth.phone")} hint={t("auth.phoneOptional")}>
        <div className="relative">
          <Phone className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            className={`${inputClassName} ps-11`}
            {...register("phone")}
            autoComplete="tel"
          />
        </div>
      </AuthField>

      <Button type="submit" className="w-full rounded-full min-h-11 gap-2" disabled={isSubmitting}>
        {isSubmitting ? t("common.loading") : t("auth.register")}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>

      <AuthFooter>
        <p>
          {t("auth.registerSubtitle")}{" "}
          <Link href={`/${locale}/login`} className="font-semibold text-primary hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </AuthFooter>
    </form>
  );
}
