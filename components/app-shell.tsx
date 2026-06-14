import type { SessionUser } from "@/lib/auth/session";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  void user;
  return (
    <div className="flex min-h-screen">
      {/* Sidebar placeholder — built out in Phase 1 */}
      <aside className="w-64 border-e bg-card hidden md:flex flex-col p-4">
        <div className="text-lg font-bold text-primary mb-6">Spims</div>
        <nav className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span>Dashboard</span>
        </nav>
      </aside>

      <div className="flex flex-col flex-1">
        {/* Topbar placeholder */}
        <header className="h-14 border-b flex items-center px-6 gap-4">
          <span className="font-semibold text-sm">
            {user.firstName} {user.lastName}
          </span>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
