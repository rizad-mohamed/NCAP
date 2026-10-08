import { useInterfaceText } from "@/lib/i18n";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { PageHeader, EmptyState, ContentSkeleton } from "@/components/common/primitives";
import {
  FilterToolbar,
  FilterField,
  dashboardSelect,
  dashboardButton,
  dashboardField,
  DashboardSearchInput,
  DashboardPagination,
  ResponsiveTableContainer,
  StatusBadge,
} from "@/components/common/dashboard-primitives";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useAdminUsers,
  useAdminUserDetails,
  useChangeAdminUser,
  type AdminUser,
} from "@/services/users-hooks";

export function AdminUsersPage() {
  const uiText = useInterfaceText();

  const { user: actor } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<"" | AdminUser["role"]>("");
  const [statusFilter, setStatusFilter] = useState<"" | AdminUser["status"]>("");
  const [sort, setSort] = useState<"created" | "name" | "email">("created");
  const [selected, setSelected] = useState<string | null>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);
  const [role, setRole] = useState<AdminUser["role"]>("learner");
  const [status, setStatus] = useState<AdminUser["status"]>("active");
  const [reason, setReason] = useState("");
  const limit = 20;
  const users = useAdminUsers({
    offset: (page - 1) * limit,
    limit,
    search,
    role: roleFilter,
    status: statusFilter,
    sort,
    direction: sort === "created" ? "desc" : "asc",
  });
  const details = useAdminUserDetails(selected);
  const change = useChangeAdminUser();
  const pages = Math.max(1, Math.ceil((users.data?.total ?? 0) / limit));
  const openUser = (item: AdminUser) => {
    setSelected(item.id);
    setRole(item.role);
    setStatus(item.status);
    setReason("");
  };
  const apply = async (kind: "role" | "status") => {
    if (!selected) return;
    try {
      await change.mutateAsync({
        target: selected,
        ...(kind === "role" ? { role } : { status }),
        reason,
      });
      toast.success(uiText("User account updated."));
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update this account.");
    }
  };
  return (
    <div className="container-ncap max-w-[1400px] py-2">
      <PageHeader
        eyebrow={uiText("Administration · Users")}
        title={uiText("Users")}
        description={uiText("Review accounts, learning progress and assessment activity.")}
      />
      <FilterToolbar label={uiText("Filter users")}>
        <DashboardSearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={uiText("Search name, email, role or status…")}
          label={uiText("Search users")}
          showLabel
        />
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <FilterField label={uiText("Role")}>
            <select
              className={dashboardSelect}
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as typeof roleFilter);
                setPage(1);
              }}
            >
              <option value="">{uiText("All roles")}</option>
              <option value="learner">{uiText("Learner")}</option>
              <option value="super_admin">{uiText("Super Admin")}</option>
            </select>
          </FilterField>
          <FilterField label={uiText("Status")}>
            <select
              className={dashboardSelect}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                setPage(1);
              }}
            >
              <option value="">{uiText("All statuses")}</option>
              <option value="active">{uiText("Active")}</option>
              <option value="suspended">{uiText("Suspended")}</option>
              <option value="disabled">{uiText("Disabled")}</option>
            </select>
          </FilterField>
          <FilterField label={uiText("Sort")}>
            <select
              className={dashboardSelect}
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(1);
              }}
            >
              <option value="created">{uiText("Newest")}</option>
              <option value="name">{uiText("Name")}</option>
              <option value="email">{uiText("Email")}</option>
            </select>
          </FilterField>
        </div>
      </FilterToolbar>
      {(users.isPending || users.isError) && (
        <div className="my-4">
          {users.isPending && <ContentSkeleton label={uiText("Loading users…")} />}
          {users.isError && (
            <p role="alert">{uiText("User records are unavailable. Please try again.")}</p>
          )}
        </div>
      )}
      {!users.isPending && !users.isError && (
        <ResponsiveTableContainer className="mt-4" label={uiText("User records")}>
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {[
                  "User",
                  "Email",
                  "Language",
                  "Role",
                  "Status",
                  "Learning progress",
                  "Lessons completed",
                  "Quiz average",
                  "Attempts",
                  "Last activity",
                  "Details",
                ].map((item) => (
                  <th
                    key={item}
                    className={`px-4 py-3 font-semibold ${item === "Details" ? "sticky right-0 z-20 border-l bg-background" : ""}`}
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users.data?.items ?? []).map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-4 font-semibold">{item.name}</td>
                  <td className="px-4 py-4">{item.email}</td>
                  <td className="px-4 py-4 uppercase">{item.language}</td>
                  <td className="px-4 py-4">
                    {item.role === "super_admin" ? "Super Admin" : "Learner"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      value={(item.status[0]?.toUpperCase() ?? "") + item.status.slice(1)}
                    />
                  </td>
                  <td className="px-4 py-4">{item.progressPercent}%</td>
                  <td className="px-4 py-4">{item.completedLessons}</td>
                  <td className="px-4 py-4">{item.quizAverage}%</td>
                  <td className="px-4 py-4">{item.attempts}</td>
                  <td className="px-4 py-4">{item.lastActivity}</td>
                  <td className="sticky right-0 z-10 border-l bg-white px-4 py-4">
                    <button
                      type="button"
                      className={dashboardButton.secondary}
                      onClick={() => openUser(item)}
                    >
                      {uiText("View")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.isPending && !users.isError && !users.data?.items.length && (
            <div className="p-6">
              <EmptyState
                title={uiText("No users found")}
                description={uiText("Adjust the filters or wait for users to register.")}
              />
            </div>
          )}
        </ResponsiveTableContainer>
      )}
      {selected && (
        <Dialog open onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent
            className="max-w-2xl"
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              panelTitle.current?.focus({ preventScroll: true });
            }}
          >
            <DialogHeader>
              <DialogTitle ref={panelTitle} tabIndex={-1}>
                {uiText("User details")}
              </DialogTitle>
              <DialogDescription>
                {uiText("Review accounts, learning progress and assessment activity.")}
              </DialogDescription>
            </DialogHeader>
            {details.isPending && <ContentSkeleton label={uiText("Loading details…")} rows={2} />}
            {details.isError && <p role="alert">{uiText("User details are unavailable.")}</p>}
            {details.data && (
              <div className="grid gap-5">
                <section aria-label={uiText("Account information")}>
                  <h3 className="mb-3 font-semibold">{details.data.name}</h3>
                  <dl className="overflow-hidden rounded-xl border text-sm">
                    {[
                      ["Email", details.data.email],
                      ["Role", details.data.role === "super_admin" ? "Super Admin" : "Learner"],
                      ["Status", details.data.status],
                      ["User ID", details.data.id],
                      ["Language", details.data.language?.toUpperCase() ?? "—"],
                      ["Joined", details.data.joinedAt],
                      ["Last activity", details.data.lastActivity],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b px-4 py-3 last:border-0 sm:grid-cols-[130px_minmax(0,1fr)]"
                      >
                        <dt className="text-muted-foreground">{uiText(label!)}</dt>
                        <dd className="min-w-0 break-words font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section aria-label={uiText("Learning summary")}>
                  <h3 className="mb-3 font-semibold">{uiText("Learning summary")}</h3>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      ["Lessons completed", details.data.completedLessons],
                      ["Modules completed", details.data.completedModules],
                      ["Learning progress", `${details.data.progressPercent}%`],
                      ["Quiz attempts", details.data.attempts],
                      ["Quiz average", `${details.data.quizAverage}%`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border bg-background p-4">
                        <dt className="text-xs text-muted-foreground">{uiText(String(label))}</dt>
                        <dd className="mt-2 text-2xl font-bold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section>
                  <h3 className="mb-3 font-semibold">{uiText("Module progress")}</h3>
                  {details.data.modules.length ? (
                    <ResponsiveTableContainer label={uiText("Module progress")}>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="px-4 py-3">{uiText("Module")}</th>
                            <th className="px-4 py-3 text-right">{uiText("Lessons completed")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.data.modules.map((module) => (
                            <tr key={module.id}>
                              <td className="px-4 py-3">{module.title}</td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                {module.completed} / {module.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ResponsiveTableContainer>
                  ) : (
                    <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      {uiText("No learning activity yet.")}
                    </p>
                  )}
                </section>
                {details.data.recentActivity.length > 0 && (
                  <section>
                    <h3 className="mb-3 font-semibold">{uiText("Recent learning activity")}</h3>
                    <ul className="divide-y rounded-lg border px-4 text-sm">
                      {details.data.recentActivity.map((activity, index) => (
                        <li
                          key={`${activity.kind}-${activity.at}-${index}`}
                          className="flex flex-wrap justify-between gap-2 py-3"
                        >
                          <span className="font-medium">{activity.kind}</span>
                          <span className="text-muted-foreground">{activity.at}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
            {details.data && selected !== actor?.id && (
              <section
                className="mt-2 grid gap-4 rounded-xl border bg-background p-4"
                aria-label={uiText("Account actions")}
              >
                <h3 className="font-semibold">{uiText("Account actions")}</h3>
                <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                  <label className="text-sm font-semibold">
                    {uiText("Role")}
                    <select
                      className={dashboardField}
                      value={role}
                      onChange={(event) => setRole(event.target.value as AdminUser["role"])}
                    >
                      <option value="learner">{uiText("Learner")}</option>
                      <option value="super_admin">{uiText("Super Admin")}</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className={dashboardButton.secondary}
                    disabled={change.isPending || role === details.data?.role}
                    onClick={() => void apply("role")}
                  >
                    {uiText("Update role")}
                  </button>
                </div>
                <div className="grid items-end gap-3 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                  <label className="text-sm font-semibold">
                    {uiText("Status")}
                    <select
                      className={dashboardField}
                      value={status}
                      onChange={(event) => setStatus(event.target.value as AdminUser["status"])}
                    >
                      <option value="active">{uiText("Active / restore")}</option>
                      <option value="suspended">{uiText("Suspend")}</option>
                      <option value="disabled">{uiText("Disable")}</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className={dashboardButton.secondary}
                    disabled={
                      change.isPending ||
                      status === details.data?.status ||
                      (status !== "active" && reason.trim().length < 3)
                    }
                    onClick={() => void apply("status")}
                  >
                    {uiText("Update status")}
                  </button>
                </div>
                <label className="text-sm font-semibold">
                  {uiText("Reason")}
                  <input
                    className={dashboardField}
                    value={reason}
                    maxLength={500}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={uiText("Required for restrictions")}
                  />
                </label>
              </section>
            )}
          </DialogContent>
        </Dialog>
      )}
      {!users.isPending && !users.isError && (
        <DashboardPagination
          page={page}
          pages={pages}
          onPageChange={setPage}
          count={users.data?.total ?? 0}
        />
      )}
    </div>
  );
}
