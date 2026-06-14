"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfileSchema } from "@/lib/validation/user";
import type { z } from "zod";

type FormData = z.infer<typeof updateProfileSchema>;

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredLocale: string;
}

export function ProfileForm({ user }: { user: UserData }) {
  const t = useTranslations();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    setSaved(false);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSaved(true);
    } else {
      const err = await res.json() as { message?: string };
      setServerError(err.message ?? t("common.error"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t("settings.firstName")}</Label>
              <Input id="firstName" {...register("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t("settings.lastName")}</Label>
              <Input id="lastName" {...register("lastName")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.email")}</Label>
            <Input value={user.email} disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("settings.phone")}</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>

          {saved && <p className="text-sm text-green-600">{t("settings.saved")}</p>}
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
