import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { SkipLink } from "@/components/shell/skip-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AuthBrandPanel, type AuthBrandVariant } from "@/components/auth/auth-brand-panel";

export async function AuthPageShell({
  brandVariant,
  mobileTagline,
  children,
}: {
  brandVariant: AuthBrandVariant;
  mobileTagline: string;
  children: ReactNode;
}) {
  const t = await getTranslations();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-low p-4 md:p-8">
      <SkipLink />
      <div className="absolute top-4 end-4 z-50 md:top-6 md:end-6">
        <LocaleSwitcher />
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border/30 bg-card shadow-soft md:flex-row"
      >
        <AuthBrandPanel variant={brandVariant} />

        <div className="flex w-full flex-col justify-center bg-card p-6 md:w-7/12 md:p-10 xl:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center md:hidden">
              <h1 className="font-display text-4xl text-primary">{t("common.appName")}</h1>
              <p className="mt-2 text-muted-foreground">{mobileTagline}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
