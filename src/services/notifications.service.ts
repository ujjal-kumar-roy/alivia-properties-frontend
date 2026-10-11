import { httpClient } from "./http-client";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResult = {
  items: NotificationItem[];
  unreadCount: number;
};

export type BackendNotification = Omit<NotificationItem, "body"> & {
  message: string;
};

export function toNotificationItem(
  item: BackendNotification,
): NotificationItem {
  return {
    id: item.id,
    title: item.title,
    body: item.message,
    type: item.type,
    link: item.link,
    isRead: item.isRead,
    createdAt: item.createdAt,
  };
}

/**
 * Client-safe notification calls. Every method takes the bearer `token`
 * explicitly (callers pass it from `useSession()` in the browser, or from
 * `auth()` on the server) so this object never imports server-only code.
 *
 * The list endpoint returns the paginated envelope plus a top-level `unread`
 * count (see backend NotificationsService.findMine).
 */
export const notificationsService = {
  async list(
    params: { page?: number; limit?: number; unread?: boolean } = {},
    token?: string,
  ): Promise<NotificationsResult> {
    const res = await httpClient.paginated<BackendNotification>(
      "/notifications",
      {
        query: params as Record<string, string | number | boolean | undefined>,
        token,
        cache: "no-store",
      },
    );
    const unreadCount =
      typeof (res as { unread?: number }).unread === "number"
        ? ((res as { unread?: number }).unread ?? 0)
        : 0;
    return { items: res.data.map(toNotificationItem), unreadCount };
  },

  markRead(id: string, token?: string): Promise<unknown> {
    return httpClient.patch(`/notifications/${id}/read`, undefined, { token });
  },

  markAllRead(token?: string): Promise<unknown> {
    return httpClient.post("/notifications/read-all", undefined, { token });
  },
};

/**
 * Server helper used by the full `/notifications` page. Pulls the token from
 * the session and never throws — returns an empty result on failure.
 */
export async function getNotifications(
  params: { limit?: number; unread?: boolean } = {},
): Promise<{ data: NotificationsResult }> {
  const session = await (await import("@/auth")).auth();
  try {
    return {
      data: await notificationsService.list(params, session?.accessToken),
    };
  } catch {
    return { data: { items: [], unreadCount: 0 } };
  }
}
