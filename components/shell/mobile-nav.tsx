"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";
import { BOTTOM_NAV_ITEMS, NavSections, filterNavItems } from "@/components/shell/nav-sections";
import { BrandMark } from "@/components/brand-mark";

export function MobileNavDrawer({
  user,
  locale,
  open,
  onClose,
}: {
  user: SessionUser;
  locale: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("shell.menu")}>
      <button
        type="button"
        className="absolute inset-0 bg-black/50 motion-reduce:transition-none"
        aria-label={t("common.cancel")}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute top-0 bottom-0 w-72 max-w-[85vw] bg-surface-low border-e border-border/60 shadow-float flex flex-col",
          "start-0 animate-in slide-in-from-start duration-200 motion-reduce:animate-none",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-border/60">
          <span className="flex items-center gap-3 min-w-0">
            <BrandMark />
            <span className="min-w-0">
              <span className="block font-display text-lg leading-none text-primary">
                {t("common.appName")}
              </span>
              <span className="block text-xs text-muted-foreground truncate mt-1">
                {t("common.appTagline")}
              </span>
            </span>
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common.cancel")}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <NavSections user={user} locale={locale} pathname={pathname} onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  );
}

export function MobileMenuButton({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("shell");
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={onOpen}
      aria-label={t("openMenu")}
      aria-expanded={false}
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

export function BottomNav({ user, locale }: { user: SessionUser; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const items = filterNavItems(BOTTOM_NAV_ITEMS, user);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-float pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around px-2 py-1.5">
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-1.5 min-h-11 text-[11px] font-medium",
                  "transition-colors motion-safe:active:scale-[0.97]",
                  active ? "text-accent-foreground" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full px-4 py-1 transition-colors",
                    active ? "bg-accent" : "bg-transparent",
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="truncate max-w-full px-1">
                  {t(item.labelKey as Parameters<typeof t>[0])}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function useMobileNav() {
  const [open, setOpen] = useState(false);
  return { open, openMenu: () => setOpen(true), closeMenu: () => setOpen(false) };
}
