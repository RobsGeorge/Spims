"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoleType, UserStatus } from "@prisma/client";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: { role: RoleType }[];
}

const STATUS_VARIANT: Record<UserStatus, "success" | "destructive" | "warning"> = {
  ACTIVE: "success",
  SUSPENDED: "destructive",
  PENDING: "warning",
};

export function UsersTable({ users, actorRoles }: { users: User[]; actorRoles: RoleType[] }) {
  const t = useTranslations();
  const router = useRouter();

  async function handleSuspend(id: string, currentStatus: UserStatus) {
    const newStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  void actorRoles;

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-start px-4 py-3 font-medium">{t("users.table.name")}</th>
            <th className="text-start px-4 py-3 font-medium">{t("users.table.email")}</th>
            <th className="text-start px-4 py-3 font-medium">{t("users.table.roles")}</th>
            <th className="text-start px-4 py-3 font-medium">{t("users.table.status")}</th>
            <th className="text-end px-4 py-3 font-medium">{t("users.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">
                {user.firstName} {user.lastName}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {user.roles.map(({ role }) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[user.status]}>
                  {t(`common.${user.status.toLowerCase()}` as Parameters<typeof t>[0])}
                </Badge>
              </td>
              <td className="px-4 py-3 text-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuspend(user.id, user.status)}
                >
                  {user.status === "SUSPENDED" ? t("users.activate") : t("users.suspend")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">{t("common.search")}</div>
      )}
    </div>
  );
}
