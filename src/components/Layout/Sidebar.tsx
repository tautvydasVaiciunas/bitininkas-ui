import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  FileStack,
  FileText,
  ListChecks,
  ListTodo,
  Newspaper,
  User,
} from "lucide-react";
import {
  GroupBeeIcon,
  HiveBeeIcon,
  ShopBeeIcon,
  UserBeeIcon,
} from "@/components/icons/BeekeepingIcons";

type NavIcon = ComponentType<{ className?: string }>;

type NavItem = {
  to: string;
  label: string;
  icon: NavIcon;
};

const profileNav: NavItem = { to: "/profile", label: "Profilis", icon: User };
const publicStoreNav: NavItem = { to: "/parduotuve", label: "Parduotuvė", icon: ShopBeeIcon };
const supportNav: NavItem = { to: "/support", label: "Žinutės", icon: Bell };
const messagesNav: NavItem = { to: "/admin/support", label: "Žinutės", icon: Bell };

const userNavItems: NavItem[] = [
  { to: "/news", label: "Naujienos", icon: Newspaper },
  { to: "/hives", label: "Aviliai", icon: HiveBeeIcon },
  { to: "/tasks", label: "Užduotys", icon: ListTodo },
  supportNav,
  publicStoreNav,
];

const adminNavSections: NavItem[][] = [
  [
    { to: "/admin/users", label: "Vartotojai", icon: UserBeeIcon },
    { to: "/admin/groups", label: "Grupės", icon: GroupBeeIcon },
    messagesNav,
    { to: "/hives", label: "Aviliai", icon: HiveBeeIcon },
  ],
  [
    { to: "/admin/news", label: "Naujienos", icon: Newspaper },
    { to: "/admin/steps", label: "Žingsniai", icon: ListChecks },
    { to: "/admin/templates", label: "Šablonai", icon: FileStack },
    { to: "/admin/tasks", label: "Užduotys", icon: ClipboardList },
    { to: "/reports", label: "Ataskaitos", icon: FileText },
    { to: "/reports/calendar", label: "Kalendorius", icon: CalendarDays },
    { to: "/reports/users", label: "Vartotojų suvestinė", icon: CalendarDays },
  ],
  [{ to: "/admin/store/products", label: "Parduotuvė", icon: ShopBeeIcon }],
];

const adminDesktopNavItems = adminNavSections.flat();
const adminMobileNavItems: NavItem[] = [
  { to: "/admin/users", label: "Vartotojai", icon: UserBeeIcon },
  { to: "/notifications", label: "Pranešimai", icon: Bell },
  { to: "/admin/news", label: "Naujienos", icon: Newspaper },
  { to: "/reports", label: "Ataskaitos", icon: FileText },
  { to: "/reports/calendar", label: "Kalendorius", icon: CalendarDays },
  { to: "/reports/users", label: "Vartotojų suvestinė", icon: CalendarDays },
  publicStoreNav,
];

export const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isPrivileged = isAdmin || isManager;

  const desktopNavItems = isPrivileged ? adminDesktopNavItems : userNavItems;
  const mobileNavItems = isPrivileged ? adminMobileNavItems : userNavItems;

  const readStoredSupportUnread = () => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return window.localStorage.getItem("supportHasUnread") === "1";
    } catch {
      return false;
    }
  };

  const [supportHasUnread, setSupportHasUnread] = useState(readStoredSupportUnread);

  useEffect(() => {
    if (!user || isPrivileged) {
      setSupportHasUnread(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("supportHasUnread", "0");
      }
      return;
    }

    let active = true;

    const fetchUnread = async () => {
      try {
        const data = await api.support.unread();
        if (!active) return;
        const next = Boolean(data?.unread);
        setSupportHasUnread(next);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("supportHasUnread", next ? "1" : "0");
        }
      } catch {
        /* silent */
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
  }, [isPrivileged, user]);

  return (
    <aside className="flex h-full min-h-screen flex-col bg-sidebar-background text-sidebar-foreground">
      <div className="flex flex-1 flex-col gap-2 px-2 lg:px-0">
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Navigacija
          </p>
        </div>
        <div className="flex flex-col gap-1 px-2 lg:hidden">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.to === messagesNav.to && supportHasUnread ? (
                <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-destructive" />
              ) : null}
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
              <div className="space-y-1">
                {adminNavSections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="space-y-1">
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
                        {item.label}
                        {item.to === messagesNav.to && supportHasUnread ? (
                          <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-destructive" />
                        ) : null}
                      </NavLink>
                    ))}
                    {sectionIndex < adminNavSections.length - 1 && (
                      <div className="my-2 border-t border-sidebar-border"></div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-1 px-2">
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
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>
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
}
