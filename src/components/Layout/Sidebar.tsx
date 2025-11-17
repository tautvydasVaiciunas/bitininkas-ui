import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Box,
  ClipboardList,
  FileStack,
  ListChecks,
  ListTodo,
  Newspaper,
  Package,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const profileNav: NavItem = { to: "/profile", label: "Profilis", icon: User };
const publicStoreNav: NavItem = { to: "/parduotuve", label: "Parduotuvė", icon: Package };
const supportNav: NavItem = { to: "/support", label: "Susisiek", icon: Bell };
const messagesNav: NavItem = { to: "/admin/support", label: "Žinutės", icon: Bell };

const userNavItems: NavItem[] = [
  { to: "/news", label: "Naujienos", icon: Newspaper },
  { to: "/hives", label: "Aviliai", icon: Box },
  { to: "/tasks", label: "Užduotys", icon: ListTodo },
  supportNav,
  publicStoreNav,
];

const adminNavSections: NavItem[][] = [
  [
    { to: "/admin/users", label: "Vartotojai", icon: Users },
    { to: "/admin/groups", label: "Grupės", icon: UsersRound },
    messagesNav,
    { to: "/hives", label: "Aviliai", icon: Box },
  ],
  [
    { to: "/admin/news", label: "Naujienos", icon: Newspaper },
    { to: "/admin/steps", label: "Žingsniai", icon: ListChecks },
    { to: "/admin/templates", label: "Šablonai", icon: FileStack },
    { to: "/admin/tasks", label: "Užduotys", icon: ClipboardList },
    { to: "/reports", label: "Ataskaitos", icon: BarChart3 },
  ],
  [{ to: "/admin/store/products", label: "Parduotuvė", icon: Package }],
];

const adminDesktopNavItems = adminNavSections.flat();
const adminMobileMainNav: NavItem[] = [
  { to: "/admin/users", label: "Vartotojai", icon: Users },
  { to: "/notifications", label: "Pranešimai", icon: Bell },
  { to: "/admin/news", label: "Naujienos", icon: Newspaper },
  { to: "/reports", label: "Ataskaitos", icon: BarChart3 },
  publicStoreNav,
];

export const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isPrivileged = isAdmin || isManager;

  const desktopNavItems = isPrivileged ? adminDesktopNavItems : userNavItems;
  const mobileNavItems = isPrivileged ? adminMobileMainNav : userNavItems;

  const [supportHasUnread, setSupportHasUnread] = useState(false);

  useEffect(() => {
    if (!user || isPrivileged) {
      setSupportHasUnread(false);
      return;
    }

    let active = true;

    const fetchUnread = async () => {
      try {
        const data = await api.support.unread();
        if (!active) return;
        setSupportHasUnread(Boolean(data?.unread));
      } catch {
        // Swallow errors to keep last known state.
      }
    };

    void fetchUnread();
    const intervalId = window.setInterval(() => {
      void fetchUnread();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user?.id, isPrivileged]);

  const adminSupportUnreadQuery = useQuery<AdminSupportUnreadResponse>({
    queryKey: ['admin', 'support', 'unread-count'],
    queryFn: () => api.support.admin.unreadCount(),
    enabled: !!user && isPrivileged,
    refetchInterval: 30_000,
  });

  const adminUnreadCount = adminSupportUnreadQuery.data?.count ?? 0;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-sidebar-border bg-sidebar shadow-lg shadow-black/5 lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:border-t-0 lg:border-r lg:shadow-none">
      <div className="hidden border-b border-sidebar-border p-6 lg:block">
        <NavLink to="/news" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <img
              src="/assets/og.jpg"
              alt="Bus medaus logotipas"
              className="h-10 w-auto max-w-full object-contain dark:hidden"
            />
            <img
              src="/assets/dark_mode_logo.png"
              alt="Bus medaus logotipas tamsiam režimui"
              className="hidden h-10 w-auto max-w-full object-contain dark:block"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Bus medaus</h1>
            <p className="text-xs text-muted-foreground">Bitininkystės sistema</p>
          </div>
        </NavLink>
      </div>

      <nav
        aria-label="Pagrindinė navigacija"
        className="h-full lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto lg:p-4"
      >
        <div className="flex h-full items-center justify-between gap-2 px-2 lg:hidden">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[0.55rem] font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )
              }
            >
              <div className="relative flex items-center justify-center">
                <item.icon className="h-4 w-4" />
                {item.to === supportNav.to && supportHasUnread ? (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
              </div>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:block">
        {isPrivileged ? (
          <>
            <div className="mb-2 px-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Administravimas
              </p>
            </div>
            {adminNavSections.map((section, index) => (
              <div key={index} className="space-y-1">
                {section.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    {item.to === messagesNav.to && adminUnreadCount > 0 ? (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[0.6rem] font-semibold text-white">
                        {adminUnreadCount}
                      </span>
                    ) : null}
                    {item.label}
                  </NavLink>
                ))}
                {index < adminNavSections.length - 1 && (
                  <div className="my-2 border-t border-sidebar-border"></div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-1">
            {desktopNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.to === supportNav.to && supportHasUnread ? (
                  <span className="ml-2 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
        </div>
      </nav>

      <div className="hidden border-t border-sidebar-border p-4 lg:block">
        {isPrivileged ? (
          <NavLink
            to={profileNav.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )
            }
          >
            <profileNav.icon className="h-5 w-5" />
            {profileNav.label}
          </NavLink>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Sukurta su meile Lietuvoje</p>
        )}
      </div>
    </aside>
  );
};
