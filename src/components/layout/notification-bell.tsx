"use client";

import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationsReadAction } from "@/features/notifications/actions";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.readAt).length;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unread > 0) {
      startTransition(async () => {
        await markNotificationsReadAction();
        router.refresh();
      });
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
        >
          <Bell />
          {unread ? (
            <span
              className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
              data-testid="unread-count"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length ? (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild className="items-start gap-2">
              <Link href={n.href ?? "/dashboard"} className="block">
                <span className="flex-1">
                  <span className={cn("block text-sm", !n.readAt && "font-semibold")}>
                    {n.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">{n.body}</span>
                </span>
                {n.readAt ? (
                  <Check className="mt-0.5 size-3 text-muted-foreground" aria-hidden="true" />
                ) : null}
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
