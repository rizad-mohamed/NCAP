import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { RepositoryError } from "@/services";
import { getAdminUsers, getAdminUserDetails, changeAdminUser } from "@/users.functions";

export interface AdminUser {
  id: string; name: string; email: string; language: string;
  role: "learner" | "super_admin"; status: "active" | "suspended" | "disabled";
  joinedAt: string; completedLessons: number; completedModules: number;
  progressPercent: number; quizAverage: number; attempts: number; lastActivity: string;
}
export interface AdminUserDetails extends AdminUser {
  modules: { id: string; title: string; completed: number; total: number }[];
  recentActivity: { kind: string; at: string }[];
}
export interface UserFilters {
  offset: number; limit: number; search: string; role: "" | AdminUser["role"];
  status: "" | AdminUser["status"]; sort: "created" | "name" | "email";
  direction: "asc" | "desc";
}
async function unwrap<T>(request: Promise<{ ok: true; data: unknown } | { ok: false; code: string; message: string }>): Promise<T> {
  const result = await request;
  if (!result.ok) throw new RepositoryError(result.code as RepositoryError["code"], result.message);
  return result.data as T;
}
export function useAdminUsers(filters: UserFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-users", user?.id, filters],
    queryFn: () => unwrap<{ total: number; items: AdminUser[] }>(getAdminUsers({ data: filters })),
    enabled: user?.role === "super_admin",
  });
}
export function useAdminUserDetails(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-user-details", user?.id, id],
    queryFn: () => unwrap<AdminUserDetails>(getAdminUserDetails({ data: id! })),
    enabled: user?.role === "super_admin" && !!id,
  });
}
export function useChangeAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: { target: string; role?: AdminUser["role"]; status?: AdminUser["status"]; reason?: string }) =>
      unwrap<void>(changeAdminUser({ data: value })),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-details"] }),
      ]),
  });
}
