import { Fragment, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Files,
  Calendar,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isTransactionProject } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { listCalendarEventsApi, listRecentEmailsFromApi } from "@/api/projects";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import BrandLogo from "@/components/brand/BrandLogo";

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  badge: number;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.to === "/") return pathname === "/";
  if (item.to === "/documents") return pathname === "/documents";
  return pathname.startsWith(item.to);
}

/** Same bucketing as TasksPage — overdue / today need attention. */
function taskDueBucket(dateStr: string): "overdue" | "today" | "week" | "later" {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(dateStr);
  const dueStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 7) return "week";
  return "later";
}

function formatBadgeExpanded(n: number): string {
  if (n > 99) return "99+";
  return String(n);
}

function formatBadgeCollapsed(n: number): string {
  if (n > 9) return "9+";
  return String(n);
}

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const reminderDrafts = useAppStore((s) => s.reminderDrafts);
  const apiOn = Boolean(getApiBaseUrl());

  const [apiCalendarDraftCount, setApiCalendarDraftCount] = useState(0);
  const [apiEmailFailureCount, setApiEmailFailureCount] = useState(0);

  const transactionProjects = useMemo(() => projects.filter(isTransactionProject), [projects]);

  const taskUrgentCount = useMemo(() => {
    return transactionProjects
      .flatMap((p) => p.tasks)
      .filter((t) => {
        if (t.status === "Complete") return false;
        if (!t.dueDate?.trim()) return false;
        const b = taskDueBucket(t.dueDate);
        return b === "overdue" || b === "today";
      }).length;
  }, [transactionProjects]);

  const documentAlertCount = useMemo(() => {
    const done = new Set(["Completed", "Complete"]);
    return transactionProjects
      .flatMap((p) => p.documents)
      .filter((d) => d.required && !done.has(d.status) && d.customStatus !== "N/A").length;
  }, [transactionProjects]);

  const localEmailFailureCount = useMemo(() => {
    return transactionProjects.flatMap((p) => p.emails).filter((e) => e.deliveryStatus === "failed").length;
  }, [transactionProjects]);

  const calendarAlertCount = apiOn ? apiCalendarDraftCount : reminderDrafts.length;
  const emailAlertCount = apiOn ? apiEmailFailureCount : localEmailFailureCount;

  useEffect(() => {
    if (!apiOn || !user) return;
    let cancelled = false;
    const run = async () => {
      try {
        const events = await listCalendarEventsApi({ kinds: ["reminder"] });
        if (!cancelled) {
          setApiCalendarDraftCount(events.filter((e) => e.source === "reminder_drafts").length);
        }
      } catch {
        if (!cancelled) setApiCalendarDraftCount(0);
      }
      try {
        const emails = await listRecentEmailsFromApi(50);
        if (!cancelled) {
          setApiEmailFailureCount(emails.filter((e) => e.deliveryStatus === "failed").length);
        }
      } catch {
        if (!cancelled) setApiEmailFailureCount(0);
      }
    };
    void run();
    const intervalId = window.setInterval(() => void run(), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [apiOn, user, location.pathname]);

  const navItems: NavItem[] = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", badge: 0 },
    ...(hasPermission(user, "clients.view")
      ? [{ to: "/clients", icon: Users, label: "Contacts", badge: 0 } satisfies NavItem]
      : []),
    ...(hasPermission(user, "projects.view")
      ? [{ to: "/projects", icon: FolderKanban, label: "Transactions", badge: 0 } satisfies NavItem]
      : []),
    ...(hasPermission(user, "documents.view")
      ? [{ to: "/documents", icon: Files, label: "Documents", badge: documentAlertCount } satisfies NavItem]
      : []),
    { to: "/tasks", icon: CheckSquare, label: "Tasks", badge: taskUrgentCount },
    { to: "/calendar", icon: Calendar, label: "Calendar", badge: calendarAlertCount },
    { to: "/email", icon: Mail, label: "Email", badge: emailAlertCount },
    { to: "/settings", icon: Settings, label: "Settings", badge: 0 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const badgeTone = (to: string) =>
    to === "/tasks"
      ? "bg-destructive text-destructive-foreground shadow-sm"
      : to === "/calendar"
        ? "bg-accent text-accent-foreground shadow-sm"
        : to === "/documents"
          ? "bg-warning text-warning-foreground shadow-sm"
          : "bg-primary text-primary-foreground shadow-sm";

  const renderNavLink = (item: NavItem) => {
    const isActive = isNavActive(location.pathname, item);
    const link = (
      <NavLink
        to={item.to}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          collapsed ? "justify-center px-2" : "pr-2",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/90 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground",
        )}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary"
            aria-hidden
          />
        )}
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0 transition-transform",
            isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-accent-foreground",
          )}
        />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge > 0 && (
          <span
            className={cn(
              "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
              badgeTone(item.to),
            )}
          >
            {formatBadgeExpanded(item.badge)}
          </span>
        )}
        {collapsed && item.badge > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none",
              badgeTone(item.to),
            )}
          >
            {formatBadgeCollapsed(item.badge)}
          </span>
        )}
      </NavLink>
    );

    if (!collapsed) return link;

    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
          {item.badge > 0 ? ` · ${formatBadgeExpanded(item.badge)}` : ""}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col self-stretch border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-[272px]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-sidebar-border/80 px-3 py-4",
          collapsed ? "justify-center px-2 py-3" : "px-4 py-5",
        )}
      >
        <BrandLogo variant={collapsed ? "mark" : "full"} className={collapsed ? "max-h-10 max-w-10" : undefined} />
      </div>

      {/* Nav */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-4">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">Menu</p>
        )}
        {navItems.map((item) => (
          <Fragment key={item.to}>
            {item.to === "/tasks" && (
              <>
                {collapsed ? (
                  <div className="mx-2 my-2 h-px shrink-0 bg-sidebar-border/70" aria-hidden />
                ) : (
                  <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
                    Activity
                  </p>
                )}
              </>
            )}
            {item.to === "/settings" && (
              <>
                {collapsed ? (
                  <div className="mx-2 my-2 h-px shrink-0 bg-sidebar-border/70" aria-hidden />
                ) : (
                  <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
                    System
                  </p>
                )}
              </>
            )}
            {renderNavLink(item)}
          </Fragment>
        ))}
      </nav>

      {/* User + actions */}
      <div className="shrink-0 space-y-2 border-t border-sidebar-border/80 p-2">
        {user && (
          <>
            {!collapsed ? (
              <div className="rounded-xl border border-sidebar-border/60 bg-sidebar-accent/25 px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/90 text-xs font-bold text-sidebar-primary-foreground">
                    {initialsFromName(user.name)}
                  </div>
                  <div className="min-w-0 flex-1 text-xs leading-snug">
                    <p className="truncate font-medium text-sidebar-accent-foreground">{user.name}</p>
                    {user.designation ? (
                      <p className="mt-0.5 truncate text-sidebar-foreground/85">{user.designation}</p>
                    ) : null}
                    {user.roleProfileName ? (
                      <p className="mt-1 truncate text-sidebar-muted">{user.roleProfileName}</p>
                    ) : null}
                    <p className="mt-0.5 truncate capitalize text-sidebar-muted">{user.role.replace("_", " ")}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div
                    className="mx-auto flex h-10 w-10 cursor-default items-center justify-center rounded-xl border border-sidebar-border/60 bg-sidebar-accent/25 text-xs font-bold text-sidebar-accent-foreground"
                    title={user.name}
                  >
                    {initialsFromName(user.name)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px]">
                  <p className="font-medium">{user.name}</p>
                  {user.designation ? <p className="text-muted-foreground text-xs">{user.designation}</p> : null}
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}

        <div className="flex flex-col gap-0.5">
          {collapsed ? (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="flex w-full items-center justify-center rounded-xl p-2.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span>Collapse</span>
            </button>
          )}

          {collapsed ? (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center justify-center rounded-xl p-2.5 text-sidebar-muted transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-sidebar-muted transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Log out</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
