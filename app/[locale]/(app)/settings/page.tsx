import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { getMe } from "@/lib/services/user";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function SettingsPage() {
  const t = await getTranslations();
  const session = await requireSession();
  const user = await getMe(session.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("settings.profile")}</p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
