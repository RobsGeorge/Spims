"use client";

import type { SessionUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { SkipLink } from "@/components/shell/skip-link";
import { PageTransition } from "@/components/motion/page-transition";
import {
  BottomNav,
  MobileNavDrawer,
  useMobileNav,
} from "@/components/shell/mobile-nav";

export function AppShell({
  children,
  user,
  locale,
}: {
  children: React.ReactNode;
  user: SessionUser;
  locale: string;
}) {
  const { open, openMenu, closeMenu } = useMobileNav();

  return (
    <div className="flex min-h-screen">
      <SkipLink />
      <Sidebar user={user} locale={locale} />
      <MobileNavDrawer user={user} locale={locale} open={open} onClose={closeMenu} />
      <div className="flex flex-col flex-1 min-w-0 pb-16 md:pb-0">
        <Topbar user={user} locale={locale} onOpenMenu={openMenu} />
        <main
          id="main-content"
          className="flex-1 overflow-auto bg-background p-4 md:p-8"
          tabIndex={-1}
        >
          <PageTransition>{children}</PageTransition>
        </main>
        <BottomNav user={user} locale={locale} />
      </div>
    </div>
  );
}
