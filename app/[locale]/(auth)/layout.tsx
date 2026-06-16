import { SkipLink } from "@/components/shell/skip-link";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <SkipLink />
      <div className="flex justify-end p-4">
        <LocaleSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <main id="main-content" className="w-full max-w-md px-4" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
