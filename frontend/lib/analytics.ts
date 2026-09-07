// GA4 via GTM dataLayer. Nothing is emitted and no script loads until
// NEXT_PUBLIC_GTM_ID is configured. Event names follow GA4 ecommerce
// conventions plus Lock City custom events (interact_3d, enter_city...).
// Every event automatically carries first-touch attribution metadata.

import { getAttribution } from "./attribution";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown> | unknown[]>;
  }
}

export interface AnalyticsItem {
  item_id: string; // lock_product_id / woo_product_id
  item_name: string;
  price?: number;
  quantity?: number;
  item_variant?: string;
  item_category?: string;
}

export function track(event: string, parameters: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_GTM_ID) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...getAttribution(), ...parameters });
}

export const viewHome = () => track("view_home");
export const enterCity = () => track("enter_city");
export const viewDrop = (dropId: string) => track("view_drop", { drop_id: dropId });
export const viewCollection = (slug: string) => track("view_collection", { collection: slug });
export const interact3D = (objectId: string, action: string) =>
  track("interact_3d", { object_id: objectId, action });

export function viewItem(item: AnalyticsItem) {
  track("view_item", { currency: "EUR", value: item.price ?? 0, items: [item] });
}
export function selectSize(itemId: string, size: string) {
  track("select_size", { item_id: itemId, size });
}
export function addToCart(item: AnalyticsItem) {
  track("add_to_cart", {
    currency: "EUR",
    value: (item.price ?? 0) * (item.quantity ?? 1),
    items: [item],
  });
}
export function viewCart(items: AnalyticsItem[], value: number) {
  track("view_cart", { currency: "EUR", value, items });
}
export function removeFromCart(item: AnalyticsItem) {
  track("remove_from_cart", { currency: "EUR", value: item.price ?? 0, items: [item] });
}
export function beginCheckout(items: AnalyticsItem[], value: number) {
  track("begin_checkout", { currency: "EUR", value, items });
}
export function emailSignup(country?: string) {
  track("email_signup", { country });
}
export function promoterClick(promoterId: string) {
  track("promoter_click", { promoter_id: promoterId });
}

// Guards against duplicate purchase events on refresh/remount.
export function purchaseOnce(args: {
  transaction_id: string;
  value: number;
  shipping?: number;
  items: AnalyticsItem[];
}) {
  if (typeof window === "undefined") return;
  const key = `lc-purchase:${args.transaction_id}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  track("purchase", { currency: "EUR", ...args });
}
