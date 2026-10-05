import { useInterfaceText } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { PageHeader, EmptyState } from "@/components/common/primitives";
import {
  dashboardButton,
  dashboardField,
  DashboardSearchInput,
  DashboardPagination,
  ResponsiveTableContainer,
  StatusBadge,
} from "@/components/common/dashboard-primitives";
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
      <div className="mt-7">
        <DashboardSearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={uiText("Search name, email, role or status…")}
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="text-sm">
            {uiText("Role")}{" "}
            <select
              className={dashboardField}
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
          </label>
          <label className="text-sm">
            {uiText("Status")}{" "}
            <select
              className={dashboardField}
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
          </label>
          <label className="text-sm">
            {uiText("Sort")}{" "}
            <select
              className={dashboardField}
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
          </label>
        </div>
      </div>
      <div className="my-4 min-h-6">
        {users.isPending && <p role="status">{uiText("Loading users…")}</p>}
        {users.isError && (
          <p role="alert">{uiText("User records are unavailable. Please try again.")}</p>
        )}
      </div>
      <ResponsiveTableContainer label={uiText("User records")}>
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
                <th key={item} className="px-4 py-3 font-semibold">
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
                <td className="px-4 py-4">
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
        {!users.isPending && !users.data?.items.length && (
          <div className="p-6">
            <EmptyState
              title={uiText("No users found")}
              description={uiText("Adjust the filters or wait for users to register.")}
            />
          </div>
        )}
      </ResponsiveTableContainer>
      {selected && (
        <section
          className="mt-5 rounded-xl border bg-white p-5"
          aria-label={uiText("User details")}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{uiText("User details")}</h2>
            <button
              type="button"
              className={dashboardButton.secondary}
              onClick={() => setSelected(null)}
            >
              {uiText("Close")}
            </button>
          </div>
          {details.isPending && <p role="status">{uiText("Loading details…")}</p>}
          {details.isError && <p role="alert">{uiText("User details are unavailable.")}</p>}
          {details.data && (
            <>
              <p className="mt-3 font-semibold">
                {details.data.name} · {details.data.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {uiText("ID:")} {details.data.id} {uiText("· Joined:")} {details.data.joinedAt}{" "}
                {uiText("· Last activity:")} {details.data.lastActivity}
              </p>
              <p className="mt-2 text-sm">
                {details.data.completedLessons} {uiText("lessons completed ·")}{" "}
                {details.data.attempts} {uiText("quiz attempts ·")} {details.data.quizAverage}
                {uiText("% quiz average")}
              </p>
              <ul className="mt-2 text-sm">
                {details.data.modules.map((module) => (
                  <li key={module.id}>
                    {module.title}: {module.completed}/{module.total} {uiText("lessons")}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm">
                {uiText("Recent learning activity:")} {details.data.recentActivity.length}{" "}
                {uiText("events")}
              </p>
            </>
          )}
          {selected !== actor?.id && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
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
              <label className="text-sm">
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
              <label className="text-sm">
                {uiText("Reason")}
                <input
                  className={dashboardField}
                  value={reason}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={uiText("Required for restrictions")}
                />
              </label>
            </div>
          )}
        </section>
      )}
      <DashboardPagination
        page={page}
        pages={pages}
        onPageChange={setPage}
        count={users.data?.total ?? 0}
      />
    </div>
  );
}
