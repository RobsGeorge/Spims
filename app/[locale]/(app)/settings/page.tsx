import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requireAppSession } from "@/lib/auth/session";
import { getMe } from "@/lib/services/user";
import { ProfileForm } from "@/components/settings/profile-form";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl border-border/60 shadow-soft p-6">
      <div className="mb-5">
        <h2 className="text-xl text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  );
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const session = await requireAppSession();
  const user = await getMe(session.id);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl text-primary">{t("settings.title")}</h1>
      </header>

      <SettingsSection title={t("settings.profile")} description={t("settings.profileDesc")}>
        <div className="mb-6 flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-border/60">
            <AvatarFallback className="bg-accent text-accent-foreground text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <ProfileForm user={user} />
      </SettingsSection>

      <SettingsSection
        title={t("settings.preferences")}
        description={t("settings.preferencesDesc")}
      >
        <PreferencesPanel />
      </SettingsSection>

      <SettingsSection title={t("settings.security")} description={t("settings.securityDesc")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("settings.changePasswordDesc")}</p>
          <Button asChild variant="outline" className="shrink-0">
            <Link href={`/${locale}/reset`}>
              <KeyRound className="me-2 h-4 w-4" aria-hidden="true" />
              {t("settings.changePassword")}
            </Link>
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
