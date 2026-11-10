'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { recordAddToCart } from './funnel';
import type { CartLine } from './types';

const KEY = 'luux_cart';

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (variant_id: number, quantity: number) => void;
  remove: (variant_id: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, 'quantity'>, quantity = 1) => {
    recordAddToCart();
    setLines((current) => {
      const existing = current.find((item) => item.variant_id === line.variant_id);
      if (existing) {
        return current.map((item) =>
          item.variant_id === line.variant_id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...current, { ...line, quantity }];
    });
  }, []);

  const setQuantity = useCallback((variant_id: number, quantity: number) => {
    setLines((current) =>
      current
        .map((item) => (item.variant_id === variant_id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const remove = useCallback((variant_id: number) => {
    setLines((current) => current.filter((item) => item.variant_id !== variant_id));
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, '[]');
    } catch {
      // The thank-you page still continues if storage is blocked.
    }
    setLines((current) => (current.length ? [] : current));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
    return { lines, count, subtotal, add, setQuantity, remove, clear };
  }, [lines, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
