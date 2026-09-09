"use client";
import { useCart } from "@/lib/cart";
import { Modal } from "./Modal";
import { CartContents } from "./CartContents";
import Link from "./StoreLink";
export function CartDrawer() {
  const cart = useCart();
  if (!cart.isOpen) return null;
  return (
    <Modal
      label="Bag"
      onClose={cart.closeCart}
      testid="cart-drawer"
      className="drawer"
    >
      <div className="flex items-center justify-between border-b border-graphite pb-5">
        <h2 className="font-display text-2xl uppercase">Bag ({cart.count})</h2>
        <button type="button" onClick={cart.closeCart}>
          Close
        </button>
      </div>
      <CartContents {...cart} onNavigate={cart.closeCart} />
      <Link
        href="/cart"
        onClick={cart.closeCart}
        className="mt-6 inline-block text-sm underline"
      >
        View bag page →
      </Link>
    </Modal>
  );
}
