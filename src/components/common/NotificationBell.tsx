import { useState } from "react";
import { Bell } from "lucide-react";
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
          className="relative grid size-11 place-items-center rounded-xl hover:bg-muted"
          aria-label={`${t("notifications.title")}: ${query.data?.unreadCount ?? 0}`}
        >
          <Bell className="size-5" />
          {!!query.data?.unreadCount && (
            <span className="absolute right-0 top-0 rounded-full bg-success px-1.5 text-xs text-white">
              {query.data.unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,420px)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t("notifications.title")}</h2>
          <button
            className="text-sm text-violet"
            disabled={mutation.isPending || !query.data?.unreadCount}
            onClick={() => mutation.mutate(null)}
          >
            {t("notifications.readAll")}
          </button>
        </div>
        {query.isPending && <p role="status">{t("notifications.loading")}</p>}
        {(query.isError || mutation.isError) && (
          <p role="alert">
            {t("notifications.error")}{" "}
            <button onClick={() => void query.refetch()}>{t("action.retry")}</button>
          </p>
        )}
        {!query.isPending && !query.isError && !items.length && (
          <p className="py-4 text-sm text-muted-foreground">{t("notifications.empty")}</p>
        )}
        <ul className="max-h-[60vh] overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="border-b py-3 text-sm">
              <p className={item.read_at ? "font-medium" : "font-bold"}>
                {item.available ? item.title : t("notifications.unavailable")}
              </p>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">{item.body}</p>
              <time dateTime={item.created_at} className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString(language)}
              </time>
              <div className="mt-2 flex justify-between gap-3">
                {item.href && ["/dashboard", "/admin/announcements"].includes(item.href) && (
                  <AppLink href={item.href} onClick={() => setOpen(false)} className="text-violet">
                    {t("notifications.view")}
                  </AppLink>
                )}
                <button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: item.id, read: !item.read_at })}
                >
                  {t(item.read_at ? "notifications.unread" : "notifications.read")}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between text-sm">
          {cursor && <button onClick={() => setCursor(null)}>{t("notifications.latest")}</button>}
          {items.length === 20 && last && (
            <button onClick={() => setCursor({ before: last.created_at, beforeId: last.id })}>
              {t("notifications.older")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
