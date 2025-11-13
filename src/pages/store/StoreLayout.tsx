import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from './utils';

interface StoreLayoutProps {
  children: React.ReactNode;
}

const navLinks = [
  { to: '/parduotuve', label: 'Produktai' },
  { to: '/parduotuve/krepselis', label: 'Krepšelis' },
];

export const StoreLayout = ({ children }: StoreLayoutProps) => {
  const location = useLocation();
  const { totalQuantity, totalAmountCents } = useCart();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-white border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/parduotuve" className="text-lg font-semibold tracking-tight text-primary">
            Parduotuvė
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={
                  location.pathname === link.to
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/parduotuve/krepselis">
              <ShoppingCart className="h-4 w-4" />
              <span>Krepšelis ({totalQuantity})</span>
              <span className="text-muted-foreground">
                {totalAmountCents > 0 ? formatPrice(totalAmountCents) : ''}
              </span>
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
};
