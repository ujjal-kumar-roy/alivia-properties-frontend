"use client";

import { Bell, BellOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  notificationsService,
  type NotificationItem,
} from "@/services/notifications.service";
import { springs } from "@/lib/motion";
import { connectNotificationsSocket } from "@/services/notifications.socket";
import { formatRelative } from "@/utils/format-date";

type NotificationsListProps = {
  initialItems: NotificationItem[];
  initialUnread: number;
};

export function NotificationsList({
  initialItems,
  initialUnread,
}: NotificationsListProps) {
  const { data: session } = useSession();

  const token = session?.accessToken;
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const knownIds = useRef(new Set(initialItems.map((item) => item.id)));
  // Rows present on first paint stay static; only ones pushed in later slide in.
  const [initialIds] = useState(() => new Set(initialItems.map((item) => item.id)));

  const load = useCallback(async () => {
    if (!token) return;
    const res = await notificationsService.list({ limit: 50 }, token);
    knownIds.current = new Set(res.items.map((item) => item.id));
    setItems(res.items);
    setUnread(res.unreadCount);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const socket = connectNotificationsSocket(token, {
      onNew(notification) {
        if (knownIds.current.has(notification.id)) return;
        knownIds.current.add(notification.id);
        setItems((prev) => [notification, ...prev].slice(0, 50));
        if (!notification.isRead) {
          setUnread((count) => count + 1);
        }
      },
      onRead(id) {
        setItems((prev) =>
          prev.map((x) => (x.id === id ? { ...x, isRead: true } : x)),
        );
      },
      onReadAll() {
        setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
        setUnread(0);
      },
      onReconnect() {
        void load();
      },
    });

    return () => {
      socket.disconnect();
    };
  }, [load, token]);

  return (
    <>
      <div className="enter-cascade mb-3 flex items-center justify-between gap-3 sm:mb-5">
        <div>
          <p className="text-eyebrow mb-1 hidden sm:block">Activity</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
            Notifications
          </h1>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800">
          <Bell aria-hidden="true" className="h-3.5 w-3.5" /> {unread} unread
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <BellOff aria-hidden="true" className="size-5" />
          </div>
          <h2 className="mt-3 font-heading text-lg font-semibold text-ink-900">
            You are all caught up
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-sm leading-snug text-ink-600">
            New updates about your enquiries, visits and listings will show up here.
          </p>
        </div>
      ) : (
        <ul className="reveal-stagger divide-y divide-border/60 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card)">
          {items.map((n) => {
            const inner = (
              <div className="flex min-h-14 items-start gap-3 px-3.5 py-3 transition-colors active:bg-brand-50 sm:hover:bg-ink-50">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 inline-block size-2 flex-none rounded-full transition-[background-color,scale] duration-300 motion-reduce:transition-none ${n.isRead ? "scale-50" : ""} ${n.isRead ? "bg-transparent" : "bg-brand-600"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-semibold leading-snug text-ink-900">
                    {n.title}
                    {!n.isRead && <span className="sr-only"> (unread)</span>}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-700">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-600">
                    {formatRelative(n.createdAt)}
                  </p>
                </div>
              </div>
            );

            return (
              <li
                key={n.id}
                className={`transition-colors duration-300 motion-reduce:transition-none ${n.isRead ? "" : "bg-brand-50/40"}`}
              >
                <motion.div
                  layout="position"
                  transition={springs.move}
                  initial={initialIds.has(n.id) ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {n.link ? <Link href={n.link} className="block">{inner}</Link> : inner}
                </motion.div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
