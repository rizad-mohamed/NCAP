import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { result, listUsers, userDetails, changeUser } from "@/server/users/service";

function client() {
  setResponseHeaders(new Headers({ "cache-control": "private, no-store", vary: "Cookie, Authorization" }));
  return createSupabaseServerClient();
}
export const getAdminUsers = createServerFn({ method: "GET" }).validator((v: unknown) => v)
  .handler(({ data }) => result(() => listUsers(client(), data)));
export const getAdminUserDetails = createServerFn({ method: "GET" }).validator((v: unknown) => v)
  .handler(({ data }) => result(() => userDetails(client(), data)));
export const changeAdminUser = createServerFn({ method: "POST" }).validator((v: unknown) => v)
  .handler(({ data }) => result(() => changeUser(client(), data)));
