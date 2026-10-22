'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
    return {
      lines,
      count,
      subtotal,
      add: (line, quantity = 1) => {
        setLines((current) => {
          const existing = current.find((item) => item.variant_id === line.variant_id);
          if (existing) {
            return current.map((item) =>
              item.variant_id === line.variant_id ? { ...item, quantity: item.quantity + quantity } : item
            );
          }
          return [...current, { ...line, quantity }];
        });
      },
      setQuantity: (variant_id, quantity) => {
        setLines((current) =>
          current
            .map((item) => (item.variant_id === variant_id ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0)
        );
      },
      remove: (variant_id) => setLines((current) => current.filter((item) => item.variant_id !== variant_id)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
