"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_PRODUCTS } from "./mock-data";
import type { CartItem, Product, ProductVariant } from "./types";

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: string, variantId: string) => void;
  removeItem: (productId: string, variantId: string) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  count: number;
  subtotal: number;
  resolve: (item: CartItem) => { product: Product; variant: ProductVariant } | null;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "lc-v2-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((productId: string, variantId: string) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === productId && i.variantId === variantId
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, qty: Math.min(i.qty + 1, 9) } : i
        );
      }
      return [...prev, { productId, variantId, qty: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, variantId: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  }, []);

  const setQty = useCallback((productId: string, variantId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
        : prev.map((i) =>
            i.productId === productId && i.variantId === variantId ? { ...i, qty } : i
          )
    );
  }, []);

  const resolve = useCallback((item: CartItem) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    return product && variant ? { product, variant } : null;
  }, []);

  const { count, subtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const item of items) {
      const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
      if (!product) continue;
      count += item.qty;
      subtotal += product.price * item.qty;
    }
    return { count, subtotal };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      setQty,
      count,
      subtotal,
      resolve,
    }),
    [items, isOpen, addItem, removeItem, setQty, count, subtotal, resolve]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
