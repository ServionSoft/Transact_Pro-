import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import AppSidebar from "./AppSidebar";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { listClientsFromApi } from "@/api/clients";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";

/** Routes that scroll inside the page shell (not the main layout wrapper). */
function usesInnerScroll(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/projects" ||
    pathname === "/projects/new" ||
    pathname === "/clients" ||
    pathname === "/tasks" ||
    pathname === "/calendar" ||
    pathname === "/settings"
  ) {
    return true;
  }
  if (/\/edit$/.test(pathname)) return true;
  if (/^\/projects\/[^/]+$/.test(pathname)) return true;
  if (/^\/clients\/[^/]+$/.test(pathname) && pathname !== "/clients/new") return true;
  return false;
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const innerScroll = usesInnerScroll(pathname);
  const user = useAuthStore((s) => s.user);
  const setClients = useAppStore((s) => s.setClients);

  useEffect(() => {
    if (!getApiBaseUrl() || !user || !hasPermission(user, "clients.view")) return;
    let cancelled = false;
    void listClientsFromApi({ archived: false })
      .then((rows) => {
        if (!cancelled) setClients(rows);
      })
      .catch(() => {
        /* ClientsPage / pickers show their own errors; avoid duplicate toasts here */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, setClients]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            innerScroll ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden overscroll-contain",
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
