import type { LucideIcon } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AuthInput({
  icon: Icon,
  error,
  className,
  ...props
}: InputProps & {
  icon: LucideIcon;
  error?: boolean;
}) {
  return (
    <div className="relative">
      <Icon
        className={cn(
          "pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2",
          error ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <Input
        className={cn(
          "min-h-11 rounded-2xl border-border/50 bg-background ps-11 pe-4",
          error && "border-destructive text-destructive focus-visible:ring-destructive/25",
          className,
        )}
        aria-invalid={error || undefined}
        {...props}
      />
    </div>
  );
}
