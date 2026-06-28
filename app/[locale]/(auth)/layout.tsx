import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

/** Re-export for pages — each page wraps content in AuthPageShell with variant. */
export { AuthPageShell };
