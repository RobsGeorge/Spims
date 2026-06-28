import type { ReactNode } from "react";

export function AuthFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="mt-8 flex flex-col gap-4 border-t border-border/30 pt-6 text-center text-sm text-muted-foreground">
      {children}
    </footer>
  );
}
