import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { listClientsFromApi } from "@/api/clients";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";

export default function AppLayout() {
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
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
