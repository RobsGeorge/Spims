"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const unread = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    void fetch("/api/notifications?limit=10")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => undefined);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -end-1 h-5 min-w-5 px-1 text-[10px]">{unread}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">No notifications</div>
        )}
        {notifications.map((n) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1" onClick={() => void markRead(n.id)}>
            <span className="font-medium text-sm">{n.title}</span>
            <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
