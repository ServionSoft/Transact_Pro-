import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const user = useAuthStore((s) => s.user);
  const bootstrapSession = useAuthStore((s) => s.bootstrapSession);

  useEffect(() => {
    if (isBootstrapping) {
      void bootstrapSession();
    }
  }, [bootstrapSession, isBootstrapping]);

  if (isBootstrapping) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Checking session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
