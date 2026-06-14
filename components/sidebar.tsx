"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Wallet,
  Settings,
  Users,
  Palette,
  GraduationCap,
  Library,
  ClipboardList,
  FileText,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";
import { RoleType } from "@prisma/client";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  roles?: RoleType[];
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.courses", href: "/courses", icon: BookOpen },
  { labelKey: "nav.grades", href: "/grades", icon: Award },
  { labelKey: "nav.wallet", href: "/wallet", icon: Wallet },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    labelKey: "nav.users",
    href: "/admin/users",
    icon: Users,
    roles: [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  },
  {
    labelKey: "nav.branding",
    href: "/admin/branding",
    icon: Palette,
    roles: [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  },
];

const ACADEMIC_ITEMS: NavItem[] = [
  {
    labelKey: "nav.programs",
    href: "/admin/programs",
    icon: GraduationCap,
    roles: [RoleType.ACADEMIC_ADMIN],
  },
  {
    labelKey: "nav.adminCourses",
    href: "/admin/courses",
    icon: Library,
    roles: [RoleType.ACADEMIC_ADMIN],
  },
  {
    labelKey: "nav.gradingSchemes",
    href: "/admin/grading-schemes",
    icon: ClipboardList,
    roles: [RoleType.ACADEMIC_ADMIN],
  },
  {
    labelKey: "nav.assessmentTemplates",
    href: "/admin/assessment-templates",
    icon: FileText,
    roles: [RoleType.ACADEMIC_ADMIN],
  },
  {
    labelKey: "nav.translations",
    href: "/admin/translations",
    icon: Languages,
    roles: [RoleType.ACADEMIC_ADMIN],
  },
];

function NavLink({
  item,
  locale,
  pathname,
  t,
}: {
  item: NavItem;
  locale: string;
  pathname: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const href = `/${locale}${item.href}`;
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {t(item.labelKey as Parameters<typeof t>[0])}
    </Link>
  );
}

export function Sidebar({ user, locale }: { user: SessionUser; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();

  const visibleAdmin = ADMIN_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => user.roles.includes(r)),
  );
  const visibleAcademic = ACADEMIC_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => user.roles.includes(r)),
  );

  return (
    <aside className="w-64 border-e bg-card hidden md:flex flex-col shrink-0">
      <div className="h-14 flex items-center px-4 border-b">
        <span className="text-lg font-bold text-primary">{t("common.appName")}</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} locale={locale} pathname={pathname} t={t} />
        ))}

        {visibleAcademic.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("nav.academic")}
            </div>
            {visibleAcademic.map((item) => (
              <NavLink key={item.href} item={item} locale={locale} pathname={pathname} t={t} />
            ))}
          </>
        )}

        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("nav.admin")}
            </div>
            {visibleAdmin.map((item) => (
              <NavLink key={item.href} item={item} locale={locale} pathname={pathname} t={t} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
