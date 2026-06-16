"use client";

import { cn } from "@/lib/utils";

export function ResponsiveTable({
  children,
  className,
  cardClassName,
  mobileCards,
}: {
  children: React.ReactNode;
  className?: string;
  cardClassName?: string;
  mobileCards: React.ReactNode;
}) {
  return (
    <>
      <div className={cn("hidden md:block rounded-md border overflow-x-auto", className)}>{children}</div>
      <div className={cn("md:hidden space-y-3", cardClassName)}>{mobileCards}</div>
    </>
  );
}
