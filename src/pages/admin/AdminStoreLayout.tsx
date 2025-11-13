import { NavLink, Outlet, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin/store/products", label: "Produktai" },
  { to: "/admin/store/orders", label: "Užsakymai" },
];

export const AdminStoreLayout = () => {
  const location = useLocation();

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex flex-wrap gap-3 border-b border-border">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet key={location.pathname} />
    </MainLayout>
  );
};
