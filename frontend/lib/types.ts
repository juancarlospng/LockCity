// Core domain models. Products carry stable identifiers — names can change,
// identifiers must not. WooCommerce remains the source of truth for catalog,
// orders and revenue. Printful for fulfillment. This frontend never
// duplicates the catalog; it maps it.

export type ProductStatus =
  | "AVAILABLE"
  | "PRE_ORDER"
  | "COMING_SOON"
  | "SOLD_OUT"
  | "UNAVAILABLE"
  | "UNKNOWN";

export type DropStatus = "ACTIVE" | "SOLD_OUT" | "ARCHIVED";

export interface ProductVariant {
  id: string;
  parentWooProductId?: number;
  size: string;
  color?: string;
  sku?: string;
  wooVariationId?: number;
  printfulVariantId?: string;
  status: ProductStatus;
  price?: number;
  regularPrice?: number;
  salePrice?: number;
  currency?: string;
  attributes?: { name: string; value: string }[];
  detailsState?: "unresolved" | "resolved";
  availability?: ProductAvailability;
  image?: string;
  sourceImage?: ProductImage;
}

export interface ProductAvailability {
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  is_on_backorder?: boolean;
  stock_status?: string;
  low_stock_remaining?: number | null;
  stock_availability?: { text: string; class: string };
}
export interface ProductCategory { id: number; name: string; slug: string; link?: string }
export interface ProductAttribute {
  id: number;
  name: string;
  taxonomy?: string;
  has_variations?: boolean;
  terms: { id: number; name: string; slug: string }[];
}
export interface ProductImage {
  id?: number;
  src: string;
  thumbnail?: string;
  srcset?: string;
  sizes?: string;
  name?: string;
  alt?: string;
}

export interface Product {
  type: string;
  categories: ProductCategory[];
  attributes: ProductAttribute[];
  hasOptions: boolean;
  variation?: string;
  availability: ProductAvailability;
  sourceImages: ProductImage[]; // Original metadata; render images through V2.
  priceRange?: { min: number; max: number };
  id: string; // internal stable id (lock_product_id)
  slug: string;
  name: string; // commercial name, e.g. LOCK HOODIE
  code?: string; // internal editorial identity, e.g. OBJECT_0041 — secondary metadata only
  price: number;
  currency: string;
  color?: string;
  category?: string;
  status: ProductStatus;
  collection?: string; // district slug
  description?: string;
  materials?: string;
  fit?: string;
  images: string[]; // real photography URLs; empty until assets exist
  sku?: string;
  wooProductId?: number;
  printfulProductId?: string;
  variants: ProductVariant[];
}

export interface Collection {
  slug: string;
  index: string; // district number, e.g. "02"
  name: string;
  description?: string;
}

export interface Drop {
  id: string;
  name: string;
  status: DropStatus;
  releasedAt?: string;
}

export interface Transmission {
  id: string;
  slug: string;
  category: "EDITORIAL" | "FILM" | "COLLAB" | "CITY" | "PEOPLE";
  title: string;
  excerpt?: string;
  image?: string;
  publishedAt?: string;
}

// People of the City — schema-ready for the future LOCKED IN NETWORK.
export interface Person {
  id: string; // person_id
  name: string;
  alias?: string;
  city?: string;
  country?: string;
  craft?: string; // artist / athlete / musician / dj / photographer / barber / designer / creator / entrepreneur / promoter / collaborator
  bio?: string;
  images: string[];
  video?: string;
  socials?: { platform: string; url: string }[];
  productsWorn?: string[]; // lock_product_id references
  campaign?: string;
  lockedInStory?: string;
}

// Cart items store a display snapshot (name/price/size) taken at add-time —
// standard headless-cart practice; WooCommerce revalidates at checkout.
export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
  name: string;
  slug: string;
  price: number;
  currency: string;
  size?: string;
  color?: string;
  image?: string;
}
