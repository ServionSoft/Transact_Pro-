import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
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
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isTransactionProject } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { getNavBadgeCountsApi } from "@/api/projects";
import { dueDateBucket } from "@/lib/transactionListUtils";
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

function formatBadgeExpanded(n: number): string {
  if (n > 99) return "99+";
  return String(n);
}

function formatBadgeCollapsed(n: number): string {
  if (n > 9) return "9+";
  return String(n);
}

const SIDEBAR_COLLAPSED_KEY = "transactpro-sidebar-collapsed";
const SIDEBAR_AUTO_COLLAPSE_MQ = "(max-width: 1279px)";

function readStoredCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) return saved === "true";
  } catch {
    /* ignore */
  }
  return typeof window !== "undefined" && window.matchMedia(SIDEBAR_AUTO_COLLAPSE_MQ).matches;
}

type AppSidebarProps = {
  inDrawer?: boolean;
  onNavigate?: () => void;
};

export default function AppSidebar({ inDrawer = false, onNavigate }: AppSidebarProps = {}) {
  const [collapsed, setCollapsedState] = useState(readStoredCollapsed);
  const isCollapsed = inDrawer ? false : collapsed;

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      if (!window.matchMedia(SIDEBAR_AUTO_COLLAPSE_MQ).matches) {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(SIDEBAR_AUTO_COLLAPSE_MQ);
    const sync = () => {
      if (mq.matches) {
        setCollapsedState(true);
        return;
      }
      setCollapsedState(readStoredCollapsed());
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [themeMounted, setThemeMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const projects = useAppStore((s) => s.projects);
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const apiOn = Boolean(getApiBaseUrl());

  const [apiBadgeCounts, setApiBadgeCounts] = useState<{
    documents: number;
    tasksUrgent: number;
    calendarReminderDrafts: number;
    emailFailures: number;
  } | null>(null);

  const transactionProjects = useMemo(() => projects.filter(isTransactionProject), [projects]);

  const localTaskUrgentCount = useMemo(() => {
    return transactionProjects.filter((p) => {
      const bucket = dueDateBucket(p.nextStepDate);
      return bucket === "overdue" || bucket === "today";
    }).length;
  }, [transactionProjects]);

  const localDocumentAlertCount = useMemo(() => {
    const done = new Set(["Completed", "Complete"]);
    return transactionProjects
      .flatMap((p) => p.documents)
      .filter((d) => d.required && !done.has(d.status) && d.customStatus !== "N/A").length;
  }, [transactionProjects]);

  const localEmailFailureCount = useMemo(() => {
    const recent = transactionProjects
      .flatMap((p) => p.emails)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
    return recent.filter((e) => e.deliveryStatus === "failed").length;
  }, [transactionProjects]);

  const localCalendarReminderCount = useMemo(
    () => calendarEvents.filter((e) => e.type === "reminder").length,
    [calendarEvents],
  );

  const badgeTitles: Record<string, string> = {
    "/documents": "Required documents still incomplete",
    "/next-steps": "Next steps overdue or due today",
    "/calendar": "Reminder items on calendar",
    "/email": "Failed sends in your 50 most recent emails",
  };

  const refreshApiBadgeCounts = useCallback(async () => {
    if (!apiOn || !user || !accessToken) return;
    try {
      const counts = await getNavBadgeCountsApi();
      setApiBadgeCounts(counts);
    } catch {
      // On failure, apiBadgeCounts stays null — resolveBadgeCount uses local store counts.
    }
  }, [apiOn, user, accessToken]);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    if (!apiOn || !user || !accessToken || isBootstrapping) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await refreshApiBadgeCounts();
    };
    void run();
    const intervalId = window.setInterval(() => void run(), 60_000);
    const onRefresh = () => void run();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("transactpro:refresh-nav-badges", onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("transactpro:refresh-nav-badges", onRefresh);
    };
  }, [apiOn, user, accessToken, isBootstrapping, location.pathname, refreshApiBadgeCounts]);

  const resolveBadgeCount = (apiValue: number | undefined, localValue: number) =>
    apiOn && apiBadgeCounts != null ? (apiValue ?? 0) : localValue;

  const documentAlertCount = resolveBadgeCount(apiBadgeCounts?.documents, localDocumentAlertCount);
  const taskUrgentCount = resolveBadgeCount(apiBadgeCounts?.tasksUrgent, localTaskUrgentCount);
  const calendarAlertCount = resolveBadgeCount(
    apiBadgeCounts?.calendarReminderDrafts,
    localCalendarReminderCount,
  );
  const emailAlertCount = resolveBadgeCount(apiBadgeCounts?.emailFailures, localEmailFailureCount);

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
    { to: "/next-steps", icon: CheckSquare, label: "Next steps", badge: taskUrgentCount },
    { to: "/calendar", icon: Calendar, label: "Calendar", badge: calendarAlertCount },
    { to: "/email", icon: Mail, label: "Email", badge: emailAlertCount },
    { to: "/settings", icon: Settings, label: "Settings", badge: 0 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isDarkMode = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  const themeToggleLabel = isDarkMode ? "Light mode" : "Dark mode";
  const ThemeIcon = isDarkMode ? Sun : Moon;

  const renderThemeToggle = () => {
    const buttonClass =
      "flex w-full items-center rounded-xl text-sidebar-muted transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

    if (!themeMounted) {
      return (
        <div
          className={cn(buttonClass, isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5")}
          aria-hidden
        >
          <Moon className="h-5 w-5 shrink-0 opacity-40" />
          {!isCollapsed ? <span className="text-sm opacity-40">Appearance</span> : null}
        </div>
      );
    }

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(buttonClass, "justify-center p-2.5")}
              aria-label={themeToggleLabel}
            >
              <ThemeIcon className="h-5 w-5 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{themeToggleLabel}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(buttonClass, "gap-3 px-3 py-2.5 text-left text-sm")}
        aria-label={themeToggleLabel}
      >
        <ThemeIcon className="h-5 w-5 shrink-0" />
        <span>{themeToggleLabel}</span>
      </button>
    );
  };

  const badgeTone = (to: string) =>
    to === "/next-steps"
      ? "bg-destructive text-destructive-foreground ring-1 ring-destructive/40 shadow-sm"
      : to === "/calendar"
        ? "bg-sidebar-primary text-sidebar-primary-foreground ring-1 ring-sidebar-primary/50 shadow-sm"
        : to === "/documents"
          ? "bg-sidebar-primary text-sidebar-primary-foreground ring-1 ring-sidebar-primary/50 shadow-sm"
          : "bg-info text-info-foreground ring-1 ring-info/40 shadow-sm";

  const renderNavLink = (item: NavItem) => {
    const isActive = isNavActive(location.pathname, item);
    const link = (
      <NavLink
        to={item.to}
        onClick={() => onNavigate?.()}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          isCollapsed ? "justify-center px-2" : "pr-2",
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
        {!isCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!isCollapsed && item.badge > 0 && (
          <span
            title={badgeTitles[item.to]}
            className={cn(
              "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
              badgeTone(item.to),
            )}
          >
            {formatBadgeExpanded(item.badge)}
          </span>
        )}
        {isCollapsed && item.badge > 0 && (
          <span
            title={badgeTitles[item.to]}
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

    if (!isCollapsed) return link;

    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
          {item.badge > 0
            ? ` · ${formatBadgeExpanded(item.badge)}${badgeTitles[item.to] ? ` (${badgeTitles[item.to]})` : ""}`
            : ""}
        </TooltipContent>
      </Tooltip>
    );
  };

  const shellClass = cn(
    "flex h-full min-h-0 flex-col self-stretch bg-sidebar text-sidebar-foreground",
    inDrawer
      ? "w-full"
      : cn(
          "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-300 ease-out lg:flex",
          isCollapsed ? "w-[76px]" : "w-[272px]",
        ),
  );

  const panel = (
    <>
      {/* Brand */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-sidebar-border/80 px-3 py-4",
          isCollapsed ? "justify-center px-2 py-3" : "px-4 py-5",
        )}
      >
        <BrandLogo variant={isCollapsed ? "mark" : "full"} className={isCollapsed ? "max-h-10 max-w-10" : undefined} />
      </div>

      {/* Nav */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-4">
        {!isCollapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">Menu</p>
        )}
        {navItems.map((item) => (
          <Fragment key={item.to}>
            {item.to === "/next-steps" && (
              <>
                {isCollapsed ? (
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
                {isCollapsed ? (
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
            {!isCollapsed ? (
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
          {renderThemeToggle()}

          {!inDrawer && isCollapsed ? (
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
          ) : !inDrawer ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span>Collapse</span>
            </button>
          ) : null}

          {isCollapsed ? (
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
    </>
  );

  if (inDrawer) {
    return <div className={shellClass}>{panel}</div>;
  }

  return <aside className={shellClass}>{panel}</aside>;
}
