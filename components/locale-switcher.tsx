"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};

export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    // Replace the locale segment in the path
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 text-sm rounded transition-colors ${
            l === locale
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          }`}
          aria-label={t("switchLanguage")}
          aria-current={l === locale ? "true" : undefined}
          data-testid={`locale-${l}`}
        >
          {LOCALE_LABELS[l] ?? l}
        </button>
      ))}
    </div>
  );
}
