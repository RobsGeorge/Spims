"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "./theme-provider";
import type { Locale } from "@/i18n/routing";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  void locale; // used by parent layout to set dir/lang on <html>

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
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
