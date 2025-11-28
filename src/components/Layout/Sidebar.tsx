import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileStack,
  ListChecks,
  ListTodo,
  Newspaper,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type AdminNavEntry = NavItem | { label: string; icon: NavIcon; children: NavItem[] };

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

const reportsNavItem: NavItem = { to: "/reports/hives", label: "Ataskaitos", icon: BarChart3 };

const adminNavSections: AdminNavEntry[][] = [
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
    reportsNavItem,
  ],
  [{ to: "/admin/store/products", label: "Parduotuvė", icon: ShopBeeIcon }],
];

const adminDesktopNavItems = adminNavSections.flatMap((section) =>
  section.flatMap((entry) => ("children" in entry ? entry.children : [entry])),
);
const adminMobileMainNav: NavItem[] = [
  { to: "/admin/users", label: "Vartotojai", icon: UserBeeIcon },
  { to: "/notifications", label: "Pranešimai", icon: Bell },
  { to: "/admin/news", label: "Naujienos", icon: Newspaper },
  reportsNavItem,
  publicStoreNav,
];

export const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isPrivileged = isAdmin || isManager;

  const desktopNavItems = isPrivileged ? adminDesktopNavItems : userNavItems;
  const mobileNavItems = isPrivileged ? adminMobileMainNav : userNavItems;

  const readStoredSupportUnread = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem('supportHasUnread') === '1';
    } catch {
      return false;
    }
  };

  const [supportHasUnread, setSupportHasUnread] = useState(readStoredSupportUnread);

  useEffect(() => {
    if (!user || isPrivileged) {
      setSupportHasUnread(false);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('supportHasUnread', '0');
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
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('supportHasUnread', next ? '1' : '0');
        }
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

  const { data: storeOrdersCountData } = useQuery<{ count: number }>({
    queryKey: ['admin-store-orders-count'],
    queryFn: () => api.admin.store.orders.count(),
    enabled: isPrivileged,
    staleTime: 60_000,
  });
  const pendingOrdersCount = storeOrdersCountData?.count ?? 0;

  const adminSupportUnreadQuery = useQuery<AdminSupportUnreadResponse>({
    queryKey: ['admin', 'support', 'unread-count'],
    queryFn: () => api.support.admin.unreadCount(),
    enabled: !!user && isPrivileged,
    refetchInterval: 30_000,
  });

  const adminUnreadCount = adminSupportUnreadQuery.data?.count ?? 0;

  const reviewQueueBadgeQuery = useQuery({
    queryKey: ['admin', 'assignments', 'review-count'],
    queryFn: () =>
      api.assignments.reviewQueue({
        status: 'pending',
        page: 1,
        limit: 1,
      }),
    enabled: !!user && isPrivileged,
    staleTime: 60_000,
  });

  const pendingReviewCount = reviewQueueBadgeQuery.data?.counts.pending ?? 0;

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
                {section.map((item) =>
                  "children" in item ? (
                    <div key={item.label} className="space-y-1 px-3">
                      <div className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      <div className="space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-primary"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                              )
                            }
                          >
                            <child.icon className="h-5 w-5" />
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ) : (
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
                      <div className="flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.to === "/admin/store/products" && pendingOrdersCount > 0 ? (
                          <Badge className="text-[0.6rem] px-2 py-0.5" variant="destructive">
                            {pendingOrdersCount}
                          </Badge>
                        ) : null}
                      </div>
                      {item.to === messagesNav.to && adminUnreadCount > 0 ? (
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[0.6rem] font-semibold text-white">
                          {adminUnreadCount}
                        </span>
                      ) : null}
                      {item.to === '/admin/tasks' && pendingReviewCount > 0 ? (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-[0.6rem] font-semibold text-white">
                          {pendingReviewCount}
                        </span>
                      ) : null}
                    </NavLink>
                  ),
                )}
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
