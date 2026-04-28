import type { AuthUser } from "@/api/auth";

/** True if the signed-in user may perform an action keyed in RBAC (matches backend `requirePermission`). */
export function hasPermission(user: AuthUser | null | undefined, key: string): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return Boolean(user.permissions?.includes(key));
}
