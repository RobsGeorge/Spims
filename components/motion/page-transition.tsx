"use client";

import { motion } from "framer-motion";
import { pageVariants } from "@/lib/motion/variants";
import { useReducedMotion } from "@/lib/hooks/use-media-query";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
