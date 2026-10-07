import { useState } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/lib/i18n";
import { AppLink } from "@/components/layout/AppShell";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listNotifications,
  syncNotifications,
  setNotificationRead,
  readAllNotifications,
} from "@/notifications.functions";
import { unwrapDashboard } from "@/services/dashboard-hooks";

interface Notification {
  id: string;
  title: string;
  body: string;
  href: string | null;
  available: boolean;
  category: string;
  created_at: string;
  read_at: string | null;
}
interface NotificationPage {
  items: Notification[];
  unreadCount: number;
}

export function NotificationBell() {
  const { user } = useAuth();
  // Remount all local pagination state when the authenticated identity changes.
  return <AccountNotificationBell key={user?.id ?? "anonymous"} />;
}
function AccountNotificationBell() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const cache = useQueryClient();
  const [cursor, setCursor] = useState<{ before: string; beforeId: string } | null>(null);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["notifications", user?.id, cursor],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const expectedUserId = user!.id;
      await unwrapDashboard(syncNotifications({ data: { expectedUserId } }));
      return unwrapDashboard<NotificationPage>(
        listNotifications({
          data: { ...(cursor ?? { before: null, beforeId: null }), expectedUserId },
        }),
      );
    },
  });
  const mutation = useMutation({
    mutationFn: (input: { id: string; read: boolean } | null) =>
      unwrapDashboard(
        input
          ? setNotificationRead({ data: { ...input, expectedUserId: user!.id } })
          : readAllNotifications({ data: { expectedUserId: user!.id } }),
      ),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
  const items = query.data?.items ?? [];
  const last = items.at(-1);
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) void query.refetch();
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative grid size-11 place-items-center rounded-lg border border-border bg-white hover:bg-muted"
          aria-label={`${t("notifications.title")}: ${query.data?.unreadCount ?? 0}`}
        >
          <Bell className="size-5" aria-hidden="true" />
          {!!query.data?.unreadCount && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-white bg-violet px-1 text-center text-[10px] font-bold leading-4 text-white"
            >
              {query.data.unreadCount > 99 ? "99+" : query.data.unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(92vw,420px)] overflow-hidden rounded-xl p-0 shadow-overlay"
        aria-label={t("notifications.title")}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <h2 className="text-lg font-bold">{t("notifications.title")}</h2>
          <button
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-violet hover:bg-primary-soft disabled:opacity-45"
            disabled={mutation.isPending || !query.data?.unreadCount}
            onClick={() => mutation.mutate(null)}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            {t("notifications.readAll")}
          </button>
        </div>
        {query.isPending && (
          <p role="status" className="px-5 py-8 text-sm text-muted-foreground">
            {t("notifications.loading")}
          </p>
        )}
        {(query.isError || mutation.isError) && (
          <p role="alert" className="m-4 rounded-lg bg-destructive-soft p-4 text-sm">
            {t("notifications.error")}{" "}
            <button className="min-h-11 font-bold underline" onClick={() => void query.refetch()}>
              {t("action.retry")}
            </button>
          </p>
        )}
        {!query.isPending && !query.isError && !items.length && (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-sm text-muted-foreground">
            <Inbox className="size-8 text-violet" strokeWidth={1.5} aria-hidden="true" />
            <p>{t("notifications.empty")}</p>
          </div>
        )}
        <ul className="app-scrollbar max-h-[min(60dvh,560px)] overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "relative border-b px-5 py-4 text-sm last:border-0",
                !item.read_at && "bg-primary-soft/60",
              )}
            >
              {!item.read_at && (
                <span
                  className="absolute left-2 top-6 size-1.5 rounded-full bg-violet"
                  aria-hidden="true"
                />
              )}
              <p className={item.read_at ? "break-words font-medium" : "break-words font-bold"}>
                {item.available ? item.title : t("notifications.unavailable")}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words leading-6 text-muted-foreground">
                {item.body}
              </p>
              <time dateTime={item.created_at} className="mt-2 block text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString(language)}
              </time>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {item.href && ["/dashboard", "/admin/announcements"].includes(item.href) && (
                  <AppLink
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-violet hover:bg-white"
                  >
                    {t("notifications.view")}
                  </AppLink>
                )}
                <button
                  className="min-h-11 rounded-lg px-2 text-xs font-bold text-muted-foreground hover:bg-white hover:text-violet disabled:opacity-50"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: item.id, read: !item.read_at })}
                >
                  {t(item.read_at ? "notifications.unread" : "notifications.read")}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t bg-background px-4 text-sm empty:hidden">
          {cursor && (
            <button
              className="min-h-11 rounded-lg px-2 font-bold text-violet"
              onClick={() => setCursor(null)}
            >
              {t("notifications.latest")}
            </button>
          )}
          {items.length === 20 && last && (
            <button
              className="min-h-11 rounded-lg px-2 font-bold text-violet"
              onClick={() => setCursor({ before: last.created_at, beforeId: last.id })}
            >
              {t("notifications.older")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
