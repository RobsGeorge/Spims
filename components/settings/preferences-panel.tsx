"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};

type ThemeMode = "light" | "dark" | "system";

type Opt<T extends string> = { value: T; label: string; icon?: React.ElementType };

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Opt<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-border/60 bg-surface-low p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon && <o.icon className="h-4 w-4" aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

function toApiTheme(mode: ThemeMode): "LIGHT" | "DARK" | "SYSTEM" {
  return mode.toUpperCase() as "LIGHT" | "DARK" | "SYSTEM";
}

export function PreferencesPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { mode, setMode } = useTheme();
  const { toast } = useToast();

  async function persist(patch: {
    preferredLocale?: string;
    themePreference?: "LIGHT" | "DARK" | "SYSTEM";
  }) {
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        toast({ variant: "destructive", title: t("common.error"), description: err.message });
        return false;
      }
      return true;
    } catch {
      toast({ variant: "destructive", title: t("common.error") });
      return false;
    }
  }

  async function switchLocale(next: string) {
    const ok = await persist({ preferredLocale: next });
    if (!ok) return;
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  async function switchTheme(next: ThemeMode) {
    setMode(next);
    const ok = await persist({ themePreference: toApiTheme(next) });
    if (ok) {
      toast({ variant: "success", title: t("settings.saved") });
    }
  }

  return (
    <div className="space-y-5">
      <Row label={t("settings.language")}>
        <Segmented
          ariaLabel={t("settings.language")}
          value={locale}
          onChange={switchLocale}
          options={routing.locales.map((l) => ({ value: l, label: LOCALE_LABELS[l] ?? l }))}
        />
      </Row>
      <Row label={t("settings.appearance")}>
        <Segmented
          ariaLabel={t("settings.appearance")}
          value={mode}
          onChange={switchTheme}
          options={[
            { value: "light", label: t("theme.light"), icon: Sun },
            { value: "dark", label: t("theme.dark"), icon: Moon },
            { value: "system", label: t("theme.system"), icon: Monitor },
          ]}
        />
      </Row>
    </div>
  );
}
