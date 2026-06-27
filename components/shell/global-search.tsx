"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

export function GlobalSearch({ locale }: { locale: string }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // "/" focuses search from anywhere (unless already typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(`/${locale}/catalog${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="hidden md:flex items-center gap-2 w-full max-w-md rounded-full bg-surface-low ps-4 pe-3 py-2 border border-border/60 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("search")}
        aria-label={t("searchLabel")}
        className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
      <kbd className="hidden lg:inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded border border-border/70 bg-surface text-[11px] font-medium text-muted-foreground">
        /
      </kbd>
    </form>
  );
}
