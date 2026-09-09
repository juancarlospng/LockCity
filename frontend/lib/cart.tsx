"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "./types";
interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  removeItem: (productId: string, variantId: string) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  count: number;
}
const CartContext = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  // No persistence: stale prices and arbitrary historical localStorage are never loaded.
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      count: items.reduce((sum, item) => sum + item.qty, 0),
      removeItem: (productId: string, variantId: string) =>
        setItems((current) =>
          current.filter(
            (i) => i.productId !== productId || i.variantId !== variantId,
          ),
        ),
      setQty: (productId: string, variantId: string, qty: number) => {
        if (!Number.isSafeInteger(qty) || qty < 1) return;
        setItems((current) =>
          current.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, qty }
              : i,
          ),
        );
      },
    }),
    [items, isOpen],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("CartProvider required");
  return ctx;
}
