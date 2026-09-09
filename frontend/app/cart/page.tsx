"use client";
import { useCart } from "@/lib/cart";
import { CartContents } from "@/components/CartContents";
export default function CartPage() {
  const cart = useCart();
  return (
    <div className="page-shell mx-auto max-w-4xl">
      <p className="eyebrow text-steel">Lock City Clothes</p>
      <h1 className="page-title mb-8">Your bag</h1>
      <CartContents {...cart} />
    </div>
  );
}
