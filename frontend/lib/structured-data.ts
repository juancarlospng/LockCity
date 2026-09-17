import "server-only";
import type { Product, ProductAvailability, ProductVariant } from "./types";
import { absoluteUrl, plainText, productImagePath, SITE_NAME } from "./seo";

const SCHEMA = "https://schema.org";

function schemaAvailability(availability?: ProductAvailability): string | undefined {
  if (!availability) return undefined;
  if (availability.is_on_backorder === true && availability.is_purchasable === true) return `${SCHEMA}/PreOrder`;
  if (availability.is_in_stock === true && availability.is_purchasable === true) return `${SCHEMA}/InStock`;
  if (availability.is_in_stock === false || availability.is_purchasable === false) return `${SCHEMA}/OutOfStock`;
  return undefined;
}

function offer(
  url: string,
  price: number | undefined,
  currency: string | undefined,
  availability: ProductAvailability | undefined,
  variant?: ProductVariant,
) {
  if (typeof price !== "number" || !Number.isFinite(price) || !currency) return undefined;
  const state = schemaAvailability(availability);
  const attributes = variant?.attributes?.map((attribute) => attribute.value).filter(Boolean);
  return {
    "@type": "Offer",
    url,
    price,
    priceCurrency: currency,
    ...(state ? { availability: state } : {}),
    ...(variant?.sku ? { sku: variant.sku } : {}),
    ...(attributes?.length ? { name: attributes.join(" / ") } : {}),
  };
}

export function productStructuredData(product: Product) {
  const url = absoluteUrl(`/product/${encodeURIComponent(product.slug)}`);
  const image = product.sourceImages[0]?.src ? absoluteUrl(productImagePath(product.slug)) : undefined;
  const offers = product.type === "variable"
    ? product.variants
      .map((variant) => offer(url, variant.price, variant.currency, variant.availability, variant))
      .filter((entry) => entry !== undefined)
    : [offer(url, product.price, product.currency, product.availability)].filter((entry) => entry !== undefined);

  return {
    "@context": SCHEMA,
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
    ...(plainText(product.description) ? { description: plainText(product.description) } : {}),
    ...(image ? { image: [image] } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(offers.length === 1 ? { offers: offers[0] } : offers.length > 1 ? { offers } : {}),
  };
}

export function productBreadcrumbData(product: Product) {
  const productUrl = absoluteUrl(`/product/${encodeURIComponent(product.slug)}`);
  return {
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
    ],
  };
}

export function onlineStoreStructuredData() {
  return {
    "@context": SCHEMA,
    "@type": "OnlineStore",
    "@id": `${absoluteUrl("/")}#store`,
    name: SITE_NAME,
    legalName: "Lock City Clothes By Yanio Concepcion Jr. SRL",
    url: absoluteUrl("/"),
    email: "info@lockcityclothes.com",
  };
}
