"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeTheme(value?: string | null): ThemeMode | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "light" || lower === "dark" || lower === "system") return lower;
  return null;
}

export function ThemeProvider({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode | null;
}) {
  const [mode, setModeState] = useState<ThemeMode>(() => initialMode ?? "system");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (initialMode) {
      setModeState(initialMode);
      localStorage.setItem("spims-theme", initialMode);
      return;
    }
    const stored = normalizeTheme(localStorage.getItem("spims-theme"));
    if (stored) setModeState(stored);
  }, [initialMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function resolve(m: ThemeMode) {
      if (m === "system") return mediaQuery.matches ? "dark" : "light";
      return m;
    }

    setResolvedMode(resolve(mode));

    const handler = () => {
      if (mode === "system") setResolvedMode(resolve(mode));
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedMode);
  }, [resolvedMode]);

  function setMode(m: ThemeMode) {
    setModeState(m);
    localStorage.setItem("spims-theme", m);
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
