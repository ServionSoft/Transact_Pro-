import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { AuthRole } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

type RoleRouteProps = {
  roles: AuthRole[];
  children: ReactNode;
};

export default function RoleRoute({ roles, children }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
