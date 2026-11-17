import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartLine } from '@/types';
import { useData, effectivePrice } from '@/data/store';

const CART_KEY = 'luma.cart.v1';

interface CartApi {
  lines: CartLine[];
  count: number;
  add: (productId: string, variantId: string, quantity?: number) => void;
  setQty: (productId: string, variantId: string, quantity: number) => void;
  remove: (productId: string, variantId: string) => void;
  clear: () => void;
  subtotal: number;
}

const CartContext = createContext<CartApi>({ lines: [], count: 0, add: () => {}, setQty: () => {}, remove: () => {}, clear: () => {}, subtotal: 0 });

export function CartProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [lines, setLines] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartLine[]; } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(lines)); }, [lines]);

  const add = useCallback((productId: string, variantId: string, quantity = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.productId === productId && l.variantId === variantId);
      if (found) return prev.map((l) => l === found ? { ...l, quantity: l.quantity + quantity } : l);
      return [...prev, { productId, variantId, quantity }];
    });
  }, []);

  const setQty = useCallback((productId: string, variantId: string, quantity: number) => {
    setLines((prev) => quantity <= 0
      ? prev.filter((l) => !(l.productId === productId && l.variantId === variantId))
      : prev.map((l) => l.productId === productId && l.variantId === variantId ? { ...l, quantity } : l));
  }, []);

  const remove = useCallback((productId: string, variantId: string) => {
    setLines((prev) => prev.filter((l) => !(l.productId === productId && l.variantId === variantId)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(() => {
    if (!data) return 0;
    return lines.reduce((sum, line) => {
      const p = data.products.find((x) => x.id === line.productId);
      const v = p?.variants.find((x) => x.id === line.variantId);
      return sum + (v ? effectivePrice(v) * line.quantity : 0);
    }, 0);
  }, [lines, data]);

  const count = lines.reduce((s, l) => s + l.quantity, 0);

  return <CartContext.Provider value={{ lines, count, add, setQty, remove, clear, subtotal }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
