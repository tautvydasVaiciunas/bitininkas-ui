import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { StoreProduct } from '@/lib/api';
import { calculateCartTotals } from '@/lib/storePricing';

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalAmountCents: number;
  subtotalNetCents: number;
  totalGrossCents: number;
  vatCents: number;
  addItem: (product: StoreProduct, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = 'store_cart';

const loadInitialCart = (): CartItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.productId === 'string' &&
        typeof item.title === 'string' &&
        typeof item.priceCents === 'number' &&
        typeof item.quantity === 'number',
    );
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadInitialCart);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: StoreProduct, quantity = 1) => {
    const normalizedQuantity = Math.max(1, Math.floor(quantity));
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + normalizedQuantity }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          title: product.title,
          priceCents: product.priceCents,
          quantity: normalizedQuantity,
          imageUrl: product.imageUrls?.[0] ?? null,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const normalizedQuantity = Math.max(1, Math.floor(quantity));
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: normalizedQuantity } : item,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => setItems([]);

  const totals = useMemo(() => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const monetary = calculateCartTotals(items);
    return {
      totalQuantity,
      subtotalNetCents: monetary.subtotalNetCents,
      totalGrossCents: monetary.totalGrossCents,
      vatCents: monetary.vatCents,
    };
  }, [items]);

  const value: CartContextValue = {
    items,
    totalQuantity: totals.totalQuantity,
    totalAmountCents: totals.subtotalNetCents,
    subtotalNetCents: totals.subtotalNetCents,
    totalGrossCents: totals.totalGrossCents,
    vatCents: totals.vatCents,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
};
