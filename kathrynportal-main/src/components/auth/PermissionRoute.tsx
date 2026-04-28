import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

type PermissionRouteProps = {
  permission: string;
  children: ReactNode;
};

export default function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user, permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
