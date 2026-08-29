"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider, type ThemeMode } from "./theme-provider";
import { Toaster } from "@/components/ui/toaster";
import type { Locale } from "@/i18n/routing";

export function Providers({
  children,
  locale,
  initialTheme,
}: {
  children: React.ReactNode;
  locale: Locale;
  initialTheme?: ThemeMode | null;
}) {
  void locale;

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialMode={initialTheme}>
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
