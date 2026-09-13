"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Product, ProductVariant } from "./types";
import { WooCartClient, buildAddItemPayload, cartErrorMessage, emptyCart, type CartSnapshot } from "./cart-core";
import { addToCart as trackAddToCart, removeFromCart as trackRemoveFromCart, viewCart } from "./analytics";

interface CartContextValue extends CartSnapshot {
  isOpen: boolean;
  isLoading: boolean;
  isMutating: boolean;
  error?: string;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => Promise<void>;
  addItem: (product: Product, variant: ProductVariant) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  setQty: (key: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new WooCartClient(), []);
  const [cart, setCart] = useState<CartSnapshot>(emptyCart);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string>();
  const mutationActive = useRef(false);

  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      setCart(await client.getCart());
    } catch (cause) {
      setError(cartErrorMessage(cause));
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => { refreshCart().catch(() => undefined); }, [refreshCart]);

  const mutate = useCallback(async (operation: () => Promise<CartSnapshot>) => {
    if (mutationActive.current) throw new Error("A cart update is already in progress.");
    mutationActive.current = true;
    setIsMutating(true);
    setError(undefined);
    try {
      const next = await operation();
      setCart(next);
      return next;
    } catch (cause) {
      setError(cartErrorMessage(cause));
      throw cause;
    } finally {
      mutationActive.current = false;
      setIsMutating(false);
    }
  }, []);

  const addItem = useCallback(async (product: Product, variant: ProductVariant) => {
    const payload = buildAddItemPayload(product, variant);
    await mutate(() => client.addItem(payload));
    trackAddToCart({
      item_id: String(payload.id), item_name: product.name,
      item_variant: variant.attributes?.map((item) => item.value).join(" / ") || variant.size,
      item_category: product.category, price: variant.price ?? product.price, quantity: 1,
    });
    setIsOpen(true);
  }, [client, mutate]);

  const removeItem = useCallback(async (key: string) => {
    const item = cart.items.find((candidate) => candidate.key === key);
    await mutate(() => client.removeItem(key));
    if (item) {
      trackRemoveFromCart({
        item_id: String(item.id), item_name: item.name,
        item_variant: item.attributes.map((attribute) => attribute.value).join(" / "),
        price: item.price, quantity: item.qty,
      });
    }
  }, [cart.items, client, mutate]);

  const setQty = useCallback(async (key: string, qty: number) => {
    if (qty <= 0) return removeItem(key);
    await mutate(() => client.updateItem(key, qty));
  }, [client, mutate, removeItem]);

  const clearCart = useCallback(async () => { await mutate(() => client.clearCart()); }, [client, mutate]);

  const openCart = useCallback(() => {
    setIsOpen(true);
    viewCart(cart.items.map((item) => ({
      item_id: String(item.id), item_name: item.name,
      item_variant: item.attributes.map((attribute) => attribute.value).join(" / "),
      price: item.price, quantity: item.qty,
    })), cart.total);
  }, [cart]);

  const value = useMemo(() => ({
    ...cart, isOpen, isLoading, isMutating, error, openCart,
    closeCart: () => setIsOpen(false), refreshCart, addItem, removeItem, setQty, clearCart,
  }), [cart, isOpen, isLoading, isMutating, error, openCart, refreshCart, addItem, removeItem, setQty, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
