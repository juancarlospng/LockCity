export type ProductStatus =
  | "AVAILABLE"
  | "PRE_ORDER"
  | "COMING_SOON"
  | "SOLD_OUT";

export type Category = "T-SHIRTS" | "HOODIES" | "BOTTOMS" | "ACCESSORIES";

export interface ProductVariant {
  id: string;
  size: string;
  status: ProductStatus;
}

export interface Product {
  id: string;
  slug: string;
  code: string; // e.g. OBJECT_0041
  name: string;
  price: number; // MOCK DATA
  currency: "EUR";
  color: string;
  category: Category;
  status: ProductStatus;
  collection: string; // collection slug
  description: string;
  materials: string;
  seed: number; // deterministic seed for procedural placeholder media
  variants: ProductVariant[];
}

export interface Collection {
  slug: string;
  districtIndex: string; // e.g. "01"
  name: string; // CORE / DROP / COLLAB / ARCHIVE
  tagline: string;
  description: string;
  seed: number;
}

export interface Drop {
  id: string;
  code: string; // DROP_001
  name: string;
  status: "AVAILABLE" | "ARCHIVED" | "SOLD_OUT";
  season: string; // MOCK season label
}

export interface Transmission {
  id: string;
  code: string; // TRANSMISSION_009
  category: "EDITORIAL" | "FILM" | "COLLAB" | "CITY" | "PEOPLE";
  title: string;
  excerpt: string;
  minutes: number;
  seed: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
}

export interface Cart {
  items: CartItem[];
}
