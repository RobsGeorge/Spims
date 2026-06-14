import { getSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getSession();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      {user && (
        <p className="text-muted-foreground">
          Welcome, {user.firstName} {user.lastName}
        </p>
      )}
    </div>
  );
}
