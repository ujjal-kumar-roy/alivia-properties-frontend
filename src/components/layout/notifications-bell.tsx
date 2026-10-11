"use client";

import { Bell, Check, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ROUTES } from "@/config/routes.config";
import { cn } from "@/lib/utils";
import {
  notificationsService,
  type NotificationItem,
} from "@/services/notifications.service";
import { connectNotificationsSocket } from "@/services/notifications.socket";
import { formatRelative } from "@/utils/format-date";

export function NotificationsBell() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const knownIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsService.list({ limit: 10 }, token);
      knownIds.current = new Set(res.items.map((item) => item.id));
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      setError("Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch once the session token is available so the badge is live before the
  // panel is ever opened (re-runs if the token changes). Intentional
  // fetch-on-mount — the React Compiler rule flags the sync setState in load().
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!token) return;

    const socket = connectNotificationsSocket(token, {
      onNew(notification) {
        if (knownIds.current.has(notification.id)) return;
        knownIds.current.add(notification.id);
        setItems((prev) => [notification, ...prev].slice(0, 10));
        if (!notification.isRead) {
          setUnreadCount((count) => count + 1);
        }
      },
      onRead(id) {
        setItems((prev) =>
          prev.map((x) => (x.id === id ? { ...x, isRead: true } : x)),
        );
      },
      onReadAll() {
        setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
        setUnreadCount(0);
      },
      onReconnect() {
        void load();
      },
    });

    return () => {
      socket.disconnect();
    };
  }, [load, token]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void load(); // refresh contents each time the panel opens
  }

  function handleSelect(n: NotificationItem) {
    setOpen(false);
    if (!n.isRead) {
      // Optimistically mark read locally + on the server, then navigate.
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      void notificationsService.markRead(n.id, token).catch(() => {});
    }
    router.push(n.link && n.link.length > 0 ? n.link : ROUTES.NOTIFICATIONS);
  }

  async function handleMarkAll() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsService.markAllRead(token);
    } catch {
      void load(); // resync if the server call failed
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={
          unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white text-ink-700 outline-none transition-[background-color,scale] hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95 data-popup-open:bg-brand-50 sm:size-10 lg:rounded-2xl"
      >
        <Bell className="size-5 sm:size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-gold-400 px-1 text-[0.6875rem] font-bold leading-none text-ink-900 shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(20rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2.5">
          <p className="text-sm font-semibold text-ink-900">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={markingAll}
              className="inline-flex min-h-9 items-center gap-1 px-1 text-xs font-medium text-brand-700 transition-colors hover:text-brand-800 disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-88 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-3 py-12 text-sm text-ink-500">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : error ? (
            <p className="px-3 py-12 text-center text-sm text-danger">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-12 text-center text-sm text-ink-500">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(n)}
                    className={cn(
                      "flex min-h-12 w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-ink-50 active:bg-ink-50",
                      !n.isRead && "bg-brand-50/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 inline-block size-1.5 flex-none rounded-full",
                        n.isRead ? "bg-transparent" : "bg-brand-600",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs text-ink-600">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-[0.6875rem] text-ink-500">
                        {formatRelative(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border/60 p-1.5">
          <Link
            href={ROUTES.NOTIFICATIONS}
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center justify-center rounded-lg px-2 py-1.5 text-center text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
