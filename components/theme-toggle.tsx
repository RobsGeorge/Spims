"use client";

import { useTranslations } from "next-intl";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light" as const, icon: Sun },
  { value: "dark" as const, icon: Moon },
  { value: "system" as const, icon: Monitor },
];

export function ThemeToggle() {
  const { mode, setMode, resolvedMode } = useTheme();
  const t = useTranslations("theme");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:bg-surface-low hover:text-foreground"
          aria-label={t("toggle")}
          data-testid="theme-toggle"
        >
          {resolvedMode === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {MODES.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onClick={() => setMode(m.value)}
            className="flex items-center gap-2"
            data-testid={`theme-${m.value}`}
            aria-pressed={mode === m.value}
          >
            <m.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className={cn("flex-1", mode === m.value && "font-medium text-foreground")}>
              {t(m.value)}
            </span>
            <Check
              className={cn("h-4 w-4 text-primary", mode === m.value ? "opacity-100" : "opacity-0")}
              aria-hidden="true"
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
