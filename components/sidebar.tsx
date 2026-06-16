"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import { NavSections } from "@/components/shell/nav-sections";

export function Sidebar({ user, locale }: { user: SessionUser; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <aside className="w-64 border-e bg-card hidden md:flex flex-col shrink-0" aria-label={t("shell.sidebar")}>
      <div className="h-14 flex items-center px-4 border-b">
        <span className="text-lg font-bold text-primary">{t("common.appName")}</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        <NavSections user={user} locale={locale} pathname={pathname} />
      </nav>
    </aside>
  );
}
