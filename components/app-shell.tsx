import type { SessionUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export function AppShell({
  children,
  user,
  locale,
}: {
  children: React.ReactNode;
  user: SessionUser;
  locale: string;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} locale={locale} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={user} locale={locale} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
