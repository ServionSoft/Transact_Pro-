import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, FolderKanban, Files, Calendar, Mail, Settings, ChevronLeft, ChevronRight, CheckSquare, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { reminderDrafts } from "@/data/mockData";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  // Mock derived counts (in a real backend these would come from queries)
  const overdueCount = 3;
  const draftsCount = reminderDrafts.length;
  const unreadEmail = 2;

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", badge: 0 },
    ...(hasPermission(user, "clients.view")
      ? [{ to: "/clients", icon: Users, label: "Contacts", badge: 0 }]
      : []),
    ...(hasPermission(user, "projects.view")
      ? [{ to: "/projects", icon: FolderKanban, label: "Transactions", badge: 0 }]
      : []),
    ...(hasPermission(user, "documents.view")
      ? [{ to: "/documents", icon: Files, label: "Documents", badge: 0 }]
      : []),
    { to: "/tasks", icon: CheckSquare, label: "Tasks", badge: overdueCount },
    { to: "/calendar", icon: Calendar, label: "Calendar", badge: draftsCount },
    { to: "/email", icon: Mail, label: "Email", badge: unreadEmail },
    { to: "/settings", icon: Settings, label: "Settings", badge: 0 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <span className="text-sidebar-primary-foreground font-display font-bold text-sm">KS</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sidebar-accent-foreground font-display font-bold text-base leading-tight truncate">
              TransactPro
            </h1>
            <p className="text-sidebar-muted text-xs truncate">Transaction Portal</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : item.to === "/documents"
                ? location.pathname === "/documents"
                : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {item.badge > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center",
                    item.to === "/tasks"
                      ? "bg-destructive text-destructive-foreground"
                      : item.to === "/calendar"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground",
                    collapsed && "absolute top-1 right-1"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {!collapsed && user && (
          <div className="px-3 pb-2 text-xs text-sidebar-muted">
            <p className="truncate text-sidebar-foreground">{user.name}</p>
            {user.designation ? <p className="truncate text-sidebar-foreground/90">{user.designation}</p> : null}
            {user.roleProfileName ? (
              <>
                <p className="truncate text-sidebar-foreground/80">{user.roleProfileName}</p>
                <p className="truncate capitalize text-sidebar-muted">{user.role.replace("_", " ")}</p>
              </>
            ) : (
              <p className="truncate capitalize">{user.role.replace("_", " ")}</p>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all w-full text-sm"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={() => void handleLogout()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all w-full text-sm"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
