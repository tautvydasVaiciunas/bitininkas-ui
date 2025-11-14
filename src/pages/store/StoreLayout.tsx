import { Link, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "./utils";

interface StoreLayoutProps {
  children: React.ReactNode;
}

const baseLinks = [
  { to: "/parduotuve", label: "Produktai" },
  { to: "/parduotuve/krepselis", label: "Krepšelis" },
  { to: "/parduotuve/uzsakymas", label: "Užsakymas" },
];

export const StoreLayout = ({ children }: StoreLayoutProps) => {
  const location = useLocation();
  const { totalQuantity, totalGrossCents } = useCart();
  const { isAuthenticated } = useAuth();

  const links = [...baseLinks];
  if (isAuthenticated) {
    links.push({ to: "/parduotuve/uzsakymai", label: "Mano užsakymai" });
  }

  return (
    <MainLayout showBreadcrumbs={false}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
            {links.map((link) => {
              const current = location.pathname;
              const isProductDetail =
                link.to === "/parduotuve" && current.startsWith("/parduotuve/produktas");
              const isActive =
                current === link.to ||
                current.startsWith(`${link.to}/`) ||
                isProductDetail;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={
                    isActive
                      ? "text-primary underline-offset-4 underline"
                      : "text-muted-foreground hover:text-foreground"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/parduotuve/krepselis">
              <ShoppingCart className="h-4 w-4" />
              <span>Krepšelis ({totalQuantity})</span>
              <span className="text-muted-foreground">
                {totalGrossCents > 0 ? formatPrice(totalGrossCents) : ""}
              </span>
            </Link>
          </Button>
        </div>

        {children}
      </div>
    </MainLayout>
  );
};
