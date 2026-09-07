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
import type { CartItem, Product, ProductVariant } from "./types";
import {
  addToCart as trackAddToCart,
  removeFromCart as trackRemoveFromCart,
  viewCart,
} from "./analytics";

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, variant: ProductVariant) => void;
  removeItem: (productId: string, variantId: string) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  count: number;
  subtotal: number;
  currency: string;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "lc-cart";

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

  const addItem = useCallback((product: Product, variant: ProductVariant) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && i.variantId === variant.id
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, qty: Math.min(i.qty + 1, 9) } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId: variant.id,
          qty: 1,
          name: product.name,
          slug: product.slug,
          price: variant.price ?? product.price,
          currency: product.currency,
          size: variant.size,
          color: variant.color ?? product.color,
          image: product.images[0],
        },
      ];
    });
    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      item_variant: variant.size,
      item_category: product.category,
      price: variant.price ?? product.price,
      quantity: 1,
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, variantId: string) => {
    setItems((prev) => {
      const item = prev.find(
        (i) => i.productId === productId && i.variantId === variantId
      );
      if (item) {
        trackRemoveFromCart({
          item_id: item.productId,
          item_name: item.name,
          item_variant: item.size,
          price: item.price,
          quantity: item.qty,
        });
      }
      return prev.filter(
        (i) => !(i.productId === productId && i.variantId === variantId)
      );
    });
  }, []);

  const setQty = useCallback(
    (productId: string, variantId: string, qty: number) => {
      setItems((prev) =>
        qty <= 0
          ? prev.filter(
              (i) => !(i.productId === productId && i.variantId === variantId)
            )
          : prev.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, qty }
                : i
            )
      );
    },
    []
  );

  const openCart = useCallback(() => {
    setIsOpen(true);
    setItems((current) => {
      viewCart(
        current.map((i) => ({
          item_id: i.productId,
          item_name: i.name,
          item_variant: i.size,
          price: i.price,
          quantity: i.qty,
        })),
        current.reduce((sum, i) => sum + i.price * i.qty, 0)
      );
      return current;
    });
  }, []);

  const { count, subtotal, currency } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const item of items) {
      count += item.qty;
      subtotal += item.price * item.qty;
    }
    return { count, subtotal, currency: items[0]?.currency ?? "EUR" };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart,
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      setQty,
      count,
      subtotal,
      currency,
    }),
    [items, isOpen, openCart, addItem, removeItem, setQty, count, subtotal, currency]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
