"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
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
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
    },
  });

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast({ variant: "success", title: t("settings.saved") });
      router.refresh();
    } else {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      toast({ variant: "destructive", title: t("common.error"), description: err.message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t("settings.firstName")}</Label>
          <Input id="firstName" aria-invalid={!!errors.firstName} {...register("firstName")} />
          {errors.firstName ? (
            <p className="text-sm text-destructive">{t("auth.validationRequired")}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t("settings.lastName")}</Label>
          <Input id="lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
          {errors.lastName ? (
            <p className="text-sm text-destructive">{t("auth.validationRequired")}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t("settings.email")}</Label>
        <Input id="email" value={user.email} disabled />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("settings.phone")}</Label>
        <Input id="phone" type="tel" {...register("phone")} />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.loading") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
