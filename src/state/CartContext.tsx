import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartLine } from '@/types';
import { useData, useSession } from '@/data/store';
import { resolveUnitPrice, checkQuantity } from '@/data/pricing';

const CART_KEY = 'luma.cart.v1';

export interface PricedLine extends CartLine {
  unitPrice: number;
  lineTotal: number;
  tierLabel: string;
  source: 'customer' | 'group' | 'default' | 'wholesale' | 'base';
  packSize: number;
  moq: number;
  stock: number;
  qtyValid: boolean;
  qtyMessage: string;
  adjustedQty: number;
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
  hasInvalid: boolean;
}

const CartContext = createContext<CartApi>({
  lines: [], priced: [], count: 0, add: () => {}, setQty: () => {}, addMany: () => {}, remove: () => {}, clear: () => {}, subtotal: 0, hasInvalid: false,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const session = useSession();
  const [lines, setLines] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartLine[]; } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(lines)); }, [lines]);

  const findVariant = useCallback((productId: string, variantId: string) => {
    const product = data?.products.find((p) => p.id === productId);
    return product?.variants.find((v) => v.id === variantId) || null;
  }, [data]);

  const add = useCallback((productId: string, variantId: string, quantity = 1) => {
    const v = findVariant(productId, variantId);
    if (!v) return;
    const check = checkQuantity(v, quantity);
    const qty = check.valid ? quantity : check.adjusted; // normalise to a valid quantity
    setLines((prev) => {
      const found = prev.find((l) => l.productId === productId && l.variantId === variantId);
      if (found) return prev.map((l) => l === found ? { ...l, quantity: l.quantity + qty } : l);
      return [...prev, { productId, variantId, quantity: qty }];
    });
  }, [findVariant]);

  const addMany = useCallback((items: { productId: string; variantId: string; quantity: number }[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const item of items) {
        const v = findVariant(item.productId, item.variantId);
        if (!v) continue;
        const check = checkQuantity(v, item.quantity);
        const qty = check.valid ? item.quantity : check.adjusted;
        const found = next.find((l) => l.productId === item.productId && l.variantId === item.variantId);
        if (found) found.quantity += qty;
        else next.push({ productId: item.productId, variantId: item.variantId, quantity: qty });
      }
      return next;
    });
  }, [findVariant]);

  const setQty = useCallback((productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((prev) => prev.filter((l) => !(l.productId === productId && l.variantId === variantId)));
      return;
    }
    const v = findVariant(productId, variantId);
    const qty = v ? (checkQuantity(v, quantity).valid ? quantity : checkQuantity(v, quantity).adjusted) : quantity;
    setLines((prev) => prev.map((l) => l.productId === productId && l.variantId === variantId ? { ...l, quantity: qty } : l));
  }, [findVariant]);

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
    try {
      return lines.flatMap((line) => {
        const product = data.products.find((p) => p.id === line.productId);
        const variant = product?.variants.find((v) => v.id === line.variantId);
        if (!variant || !product) return [];
        const result = resolveUnitPrice(data, variant, product.id, line.quantity, customer);
        const qc = checkQuantity(variant, line.quantity);
        return [{
          ...line,
          unitPrice: result.unitPrice,
          lineTotal: result.unitPrice * line.quantity,
          tierLabel: result.tierLabel,
          source: result.source,
          packSize: variant.packSize ?? 1,
          moq: variant.moq ?? 1,
          stock: variant.stock,
          qtyValid: qc.valid,
          qtyMessage: qc.messageAr,
          adjustedQty: qc.adjusted,
        }];
      });
    } catch (err) {
      // A pricing failure must never blank the cart; fall back to base prices.
      console.error('[cart] pricing failed', err);
      return lines.flatMap((line) => {
        const product = data.products.find((p) => p.id === line.productId);
        const variant = product?.variants.find((v) => v.id === line.variantId);
        if (!variant || !product) return [];
        const unitPrice = variant.salePrice ?? variant.retailPrice;
        return [{
          ...line, unitPrice, lineTotal: unitPrice * line.quantity,
          tierLabel: 'سعر البيع', source: 'base' as const,
          packSize: variant.packSize ?? 1, moq: variant.moq ?? 1, stock: variant.stock,
          qtyValid: true, qtyMessage: '', adjustedQty: line.quantity,
        }];
      });
    }
  }, [lines, data, customer]);

  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  // Count and validity derive from the same resolvable lines the cart page
  // renders, so the header badge can never disagree with the cart contents.
  const count = priced.reduce((s, l) => s + l.quantity, 0);
  const hasInvalid = priced.some((l) => !l.qtyValid);

  return <CartContext.Provider value={{ lines, priced, count, add, setQty, addMany, remove, clear, subtotal, hasInvalid }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
