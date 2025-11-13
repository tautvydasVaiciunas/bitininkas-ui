import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { StoreProduct } from '@/lib/api';

type CartItem = {
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalAmountCents: number;
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
    const totalAmountCents = items.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );
    return { totalQuantity, totalAmountCents };
  }, [items]);

  const value: CartContextValue = {
    items,
    totalQuantity: totals.totalQuantity,
    totalAmountCents: totals.totalAmountCents,
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
