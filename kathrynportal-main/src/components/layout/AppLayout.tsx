import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import AppSidebar from "./AppSidebar";
import AppMobileHeader from "./AppMobileHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { listClientsFromApi } from "@/api/clients";
import { useIsCompactNav } from "@/hooks/use-mobile";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";

function isListShellRoute(pathname: string): boolean {
  return (
    pathname === "/projects" ||
    pathname === "/clients" ||
    pathname === "/tasks" ||
    pathname === "/calendar" ||
    pathname === "/documents"
  );
}

/** New / edit transaction wizard — always page scroll (never inner shell). */
function isTransactionFormRoute(pathname: string): boolean {
  return pathname === "/projects/new" || /^\/projects\/[^/]+\/edit$/.test(pathname);
}

/** Transaction detail (`/projects/:id`), not create (`/projects/new`) or nested paths. */
function isProjectDetailRoute(pathname: string): boolean {
  const match = pathname.match(/^\/projects\/([^/]+)$/);
  if (!match) return false;
  return match[1] !== "new";
}

function usesCompactPageScroll(pathname: string): boolean {
  return isListShellRoute(pathname) || isProjectDetailRoute(pathname);
}

/**
 * Routes that lock the layout and scroll only inside a page panel (toolbar + list).
 * Feed-style pages (dashboard, email, client detail) use normal page scroll instead.
 */
function usesInnerScroll(pathname: string): boolean {
  if (isTransactionFormRoute(pathname)) return false;
  if (
    pathname === "/projects" ||
    pathname === "/clients" ||
    pathname === "/tasks" ||
    pathname === "/calendar" ||
    pathname === "/documents"
  ) {
    return true;
  }
  if (isProjectDetailRoute(pathname)) return true;
  return false;
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const compactNav = useIsCompactNav();
  const innerScroll =
    !isTransactionFormRoute(pathname) &&
    usesInnerScroll(pathname) &&
    !(compactNav && usesCompactPageScroll(pathname));
  const user = useAuthStore((s) => s.user);
  const setClients = useAppStore((s) => s.setClients);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(100vw-1rem,288px)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:right-3 [&>button]:top-3 [&>button]:text-sidebar-foreground hover:[&>button]:text-sidebar-accent-foreground"
        >
          <AppSidebar inDrawer onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppMobileHeader onOpenNav={() => setMobileNavOpen(true)} />
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            innerScroll
              ? "flex flex-col overflow-hidden"
              : isTransactionFormRoute(pathname)
                ? "overflow-y-auto overflow-x-hidden overscroll-y-contain"
                : cn(
                    "flex flex-col safe-bottom overflow-y-auto overflow-x-hidden",
                    "overscroll-contain",
                  ),
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
