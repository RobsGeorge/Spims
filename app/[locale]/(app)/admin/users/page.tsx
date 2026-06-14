import { useTranslations } from "next-intl";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { listUsers } from "@/lib/services/user";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const t = useTranslations();
  const session = await requireSession();
  await authorize(session, "user.manage");

  const { users, total } = await listUsers({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("users.title")}</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
      </div>
      <UsersTable users={users} actorRoles={session.roles} />
    </div>
  );
}
