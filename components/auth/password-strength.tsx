"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function scorePassword(value: string) {
  const rules = {
    length: value.length >= 8,
    number: /\d/.test(value),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    case: /[a-z]/.test(value) && /[A-Z]/.test(value),
  };
  const score = Object.values(rules).filter(Boolean).length;
  return { rules, score };
}

export function PasswordStrength({ password }: { password: string }) {
  const t = useTranslations("auth.passwordStrength");
  const { rules, score } = useMemo(() => scorePassword(password), [password]);

  const labels = [t("weak"), t("fair"), t("good"), t("strong")];
  const label = password.length === 0 ? t("empty") : labels[Math.max(0, score - 1)] ?? t("weak");

  const ruleItems = [
    { key: "length", met: rules.length, label: t("ruleLength") },
    { key: "number", met: rules.number, label: t("ruleNumber") },
    { key: "symbol", met: rules.symbol, label: t("ruleSymbol") },
    { key: "case", met: rules.case, label: t("ruleCase") },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-border/30 bg-surface-low p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("label")}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-surface-variant">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-full flex-1 rounded-full transition-colors",
              i < score
                ? score <= 1
                  ? "bg-destructive"
                  : score === 2
                    ? "bg-gold"
                    : "bg-success"
                : "bg-transparent",
            )}
          />
        ))}
      </div>
      <ul className="space-y-1.5 text-sm">
        {ruleItems.map((rule) => (
          <li
            key={rule.key}
            className={cn(
              "flex items-center gap-2",
              rule.met ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {rule.met ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
