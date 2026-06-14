"use client";

import { useTheme } from "./theme-provider";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const t = useTranslations("theme");

  const modes = [
    { value: "light" as const, label: t("light") },
    { value: "dark" as const, label: t("dark") },
    { value: "system" as const, label: t("system") },
  ];

  return (
    <div className="flex items-center gap-1">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          className={`px-2 py-1 text-sm rounded transition-colors ${
            mode === m.value
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          }`}
          aria-pressed={mode === m.value}
          data-testid={`theme-${m.value}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
