"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-media-query";

export function InteractiveCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={cn("rounded-lg border bg-card shadow-sm", className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow",
        "hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
