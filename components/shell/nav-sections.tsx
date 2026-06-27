"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Wallet,
  Settings,
  CreditCard,
  Banknote,
  Users,
  Palette,
  GraduationCap,
  Library,
  ClipboardList,
  FileText,
  Languages,
  Calendar,
  Layers,
  UserCheck,
  ShoppingCart,
  ClipboardCheck,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";
import { RoleType } from "@prisma/client";

export interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  roles?: RoleType[];
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.courses", href: "/courses", icon: BookOpen },
  { labelKey: "nav.catalog", href: "/catalog", icon: ShoppingCart, roles: [RoleType.STUDENT] },
  { labelKey: "nav.degreeAudit", href: "/degree-audit", icon: ClipboardCheck, roles: [RoleType.STUDENT] },
  { labelKey: "nav.grades", href: "/grades", icon: Award },
  { labelKey: "nav.wallet", href: "/wallet", icon: Wallet },
  { labelKey: "nav.billing", href: "/billing", icon: CreditCard },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];

export const TEACH_ITEMS: NavItem[] = [
  {
    labelKey: "nav.teach",
    href: "/teach",
    icon: PenLine,
    roles: [RoleType.INSTRUCTOR, RoleType.TA],
  },
];

export const FINANCE_ITEMS: NavItem[] = [
  {
    labelKey: "nav.payments",
    href: "/admin/payments",
    icon: Banknote,
    roles: [RoleType.FINANCIAL_ADMIN, RoleType.SUPER_ADMIN],
  },
  {
    labelKey: "nav.adminWallet",
    href: "/admin/wallet",
    icon: Wallet,
    roles: [RoleType.FINANCIAL_ADMIN, RoleType.SUPER_ADMIN],
  },
];

export const ADMIN_ITEMS: NavItem[] = [
  {
    labelKey: "nav.users",
    href: "/admin/users",
    icon: Users,
    roles: [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  },
  {
    labelKey: "nav.admissions",
    href: "/admin/admissions",
    icon: UserCheck,
    roles: [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  },
  {
    labelKey: "nav.branding",
    href: "/admin/branding",
    icon: Palette,
    roles: [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  },
  {
    labelKey: "nav.semesters",
    href: "/admin/semesters",
    icon: Calendar,
    roles: [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  },
  {
    labelKey: "nav.scheduling",
    href: "/admin/scheduling",
    icon: Calendar,
    roles: [RoleType.SUPER_ADMIN, RoleType.ADMINISTRATIVE_ADMIN],
  },
];

export const ACADEMIC_ITEMS: NavItem[] = [
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
  {
    labelKey: "nav.offerings",
    href: "/admin/offerings",
    icon: Layers,
    roles: [
      RoleType.ACADEMIC_ADMIN,
      RoleType.FINANCIAL_ADMIN,
      RoleType.INSTRUCTOR,
      RoleType.TA,
    ],
  },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.courses", href: "/courses", icon: BookOpen },
  { labelKey: "nav.grades", href: "/grades", icon: Award },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];

export function NavLink({
  item,
  locale,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  locale: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations();
  const href = `/${locale}${item.href}`;
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-11 text-sm font-medium",
        "transition-colors duration-200 motion-safe:active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-surface-high hover:text-foreground",
      )}
    >
      <item.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-primary",
        )}
        aria-hidden="true"
      />
      <span className="truncate">{t(item.labelKey as Parameters<typeof t>[0])}</span>
    </Link>
  );
}

export function filterNavItems(items: NavItem[], user: SessionUser) {
  return items.filter((item) => !item.roles || item.roles.some((r) => user.roles.includes(r)));
}

export function NavSections({
  user,
  locale,
  pathname,
  onNavigate,
}: {
  user: SessionUser;
  locale: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations();
  const visibleAdmin = filterNavItems(ADMIN_ITEMS, user);
  const visibleAcademic = filterNavItems(ACADEMIC_ITEMS, user);
  const visibleFinance = filterNavItems(FINANCE_ITEMS, user);
  const visibleTeach = filterNavItems(TEACH_ITEMS, user);

  return (
    <>
      {filterNavItems(NAV_ITEMS, user).map((item) => (
        <NavLink key={item.href} item={item} locale={locale} pathname={pathname} onNavigate={onNavigate} />
      ))}

      {visibleAcademic.length > 0 && (
        <>
          <div className="pt-4 pb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nav.academic")}
          </div>
          {visibleAcademic.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </>
      )}

      {visibleTeach.length > 0 && (
        <>
          <div className="pt-4 pb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nav.teaching")}
          </div>
          {visibleTeach.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </>
      )}

      {visibleFinance.length > 0 && (
        <>
          <div className="pt-4 pb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nav.finance")}
          </div>
          {visibleFinance.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </>
      )}

      {visibleAdmin.length > 0 && (
        <>
          <div className="pt-4 pb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nav.admin")}
          </div>
          {visibleAdmin.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </>
  );
}
