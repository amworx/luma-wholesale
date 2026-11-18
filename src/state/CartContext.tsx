import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartLine } from '@/types';
import { useData, useSession } from '@/data/store';
import { resolveUnitPrice } from '@/data/pricing';

const CART_KEY = 'luma.cart.v1';

export interface PricedLine extends CartLine {
  unitPrice: number;
  lineTotal: number;
  tierLabel: string;
  source: 'customer' | 'group' | 'default' | 'base';
}

interface CartApi {
  lines: CartLine[];
  priced: PricedLine[];
  count: number;
  add: (productId: string, variantId: string, quantity?: number) => void;
  setQty: (productId: string, variantId: string, quantity: number) => void;
  addMany: (items: { productId: string; variantId: string; quantity: number }[]) => void;
  remove: (productId: string, variantId: string) => void;
  clear: () => void;
  subtotal: number;
}

const CartContext = createContext<CartApi>({
  lines: [], priced: [], count: 0, add: () => {}, setQty: () => {}, addMany: () => {}, remove: () => {}, clear: () => {}, subtotal: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const session = useSession();
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

  const addMany = useCallback((items: { productId: string; variantId: string; quantity: number }[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const item of items) {
        const found = next.find((l) => l.productId === item.productId && l.variantId === item.variantId);
        if (found) found.quantity += item.quantity;
        else next.push({ ...item });
      }
      return next;
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

  const customer = useMemo(
    () => (data && session ? data.users.find((u) => u.id === session.userId) || null : null),
    [data, session]
  );

  const priced = useMemo<PricedLine[]>(() => {
    if (!data) return [];
    return lines.flatMap((line) => {
      const product = data.products.find((p) => p.id === line.productId);
      const variant = product?.variants.find((v) => v.id === line.variantId);
      if (!variant || !product) return [];
      const result = resolveUnitPrice(data, variant, product.id, line.quantity, customer);
      return [{
        ...line,
        unitPrice: result.unitPrice,
        lineTotal: result.unitPrice * line.quantity,
        tierLabel: result.tierLabel,
        source: result.source,
      }];
    });
  }, [lines, data, customer]);

  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  return <CartContext.Provider value={{ lines, priced, count, add, setQty, addMany, remove, clear, subtotal }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
