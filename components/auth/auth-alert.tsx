import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthAlert({
  variant = "error",
  children,
}: {
  variant?: "error" | "success";
  children: ReactNode;
}) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      role="alert"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-2xl border p-4",
        variant === "error" &&
          "border-destructive/30 bg-destructive/5 text-destructive",
        variant === "success" &&
          "border-success/30 bg-success/10 text-success",
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}
