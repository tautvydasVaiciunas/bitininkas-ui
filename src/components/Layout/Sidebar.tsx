import { NavLink } from "react-router-dom";
import {
  Box,
  ListTodo,
  Bell,
  User,
  Users,
  UsersRound,
  ListChecks,
  ClipboardList,
  FileStack,
  BarChart3,
  Newspaper,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;

  const navItems = [
    { to: "/news", label: "Naujienos", icon: Newspaper, show: true },
    { to: "/hives", label: "Aviliai", icon: Box, show: true },
    { to: "/tasks", label: "Užduotys", icon: ListTodo, show: true },
    { to: "/notifications", label: "Pranešimai", icon: Bell, show: true },
    { to: "/profile", label: "Profilis", icon: User, show: true },
  ];

  const adminItems = [
    { to: "/admin/users", label: "Vartotojai", icon: Users, show: isAdmin },
    { to: "/admin/groups", label: "Grupės", icon: UsersRound, show: isManager },
    { to: "/admin/steps", label: "Žingsniai", icon: ListChecks, show: isManager },
    {
      to: "/admin/tasks",
      label: "Užduotys",
      icon: ClipboardList,
      show: isManager,
    },
    {
      to: "/admin/templates",
      label: "Šablonai",
      icon: FileStack,
      show: isManager,
    },
    {
      to: "/admin/news",
      label: "Naujienos",
      icon: Newspaper,
      show: isManager,
    },
    {
      to: "/reports",
      label: "Ataskaitos",
      icon: BarChart3,
      show: isManager,
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);
  const visibleAdminItems = adminItems.filter((item) => item.show);
  const mobileNavItems = [...visibleNavItems, ...visibleAdminItems];

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-sidebar-border bg-sidebar shadow-lg shadow-black/5 lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:border-t-0 lg:border-r lg:shadow-none">
      <div className="hidden lg:block border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <img
              src="https://static.wixstatic.com/media/453317_cb9f63ff26714a80828d532ffc091160~mv2.png"
              alt="Bus medaus logotipas"
              className="h-10 w-auto max-w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              Bus medaus
            </h1>
            <p className="text-xs text-muted-foreground">
              Bitininkystės sistema
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="Pagrindinė navigacija" className="h-full lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto lg:p-4">
        <div className="flex h-full items-center gap-1 overflow-x-auto px-4 lg:hidden">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-[0.7rem] font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:block">
          <div className="space-y-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
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

          {isManager && visibleAdminItems.length > 0 && (
            <>
              <div className="my-4 border-t border-sidebar-border" />
              <div className="mb-2 px-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Administravimas
                </p>
              </div>
              <div className="space-y-1">
                {visibleAdminItems.map((item) => (
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
            </>
          )}
        </div>
      </nav>

      <div className="hidden border-t border-sidebar-border p-4 lg:block">
        <p className="text-center text-xs text-muted-foreground">
          Sukurta su ❤️ Lietuvoje
        </p>
      </div>
    </aside>
  );
};
