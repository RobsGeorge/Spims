"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { MobileMenuButton } from "@/components/shell/mobile-nav";
import { GlobalSearch } from "@/components/shell/global-search";
import { BrandMark } from "@/components/brand-mark";
import type { SessionUser } from "@/lib/auth/session";

export function Topbar({
  user,
  locale,
  onOpenMenu,
}: {
  user: SessionUser;
  locale: string;
  onOpenMenu?: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 px-4 md:px-6 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70 border-b border-border/60 shadow-soft">
      {onOpenMenu && <MobileMenuButton onOpen={onOpenMenu} />}

      {/* Mobile brand (sidebar carries it on desktop) */}
      <Link
        href={`/${locale}/dashboard`}
        className="flex md:hidden items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <BrandMark className="h-8 w-8" />
        <span className="font-display text-lg text-primary">{t("common.appName")}</span>
      </Link>

      <GlobalSearch locale={locale} />

      <div className="flex-1" />

      <div className="flex items-center gap-1 md:gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
        <NotificationsBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring hover:shadow-soft"
              aria-label={t("shell.userMenu")}
            >
              <Avatar className="h-9 w-9 border border-border/60">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/${locale}/settings`)}>
              <Settings className="me-2 h-4 w-4" />
              {t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="me-2 h-4 w-4" />
              {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
