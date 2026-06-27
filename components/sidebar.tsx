"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { NavSections } from "@/components/shell/nav-sections";
import { BrandMark } from "@/components/brand-mark";

export function Sidebar({ user, locale }: { user: SessionUser; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex w-[280px] shrink-0 flex-col bg-surface-low border-e border-border/60"
      aria-label={t("shell.sidebar")}
    >
      <Link
        href={`/${locale}/dashboard`}
        className="flex items-center gap-3 px-5 py-6 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
      >
        <BrandMark />
        <span className="min-w-0">
          <span className="block font-display text-xl leading-none text-primary">
            {t("common.appName")}
          </span>
          <span className="block text-xs text-muted-foreground truncate mt-1">
            {t("common.appTagline")}
          </span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        <NavSections user={user} locale={locale} pathname={pathname} />
      </nav>
    </aside>
  );
}
