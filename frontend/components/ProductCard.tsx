import Link from "@/components/StoreLink";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { StatusBadge } from "./StatusBadge";
export function ProductCard({ product }: { product: Product; index?: number }) {
  const name = product.commercialName || product.name;
  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="product-card group border border-graphite bg-card"
    >
      <Link
        href={product.href || `/product/${product.slug}`}
        className="block"
        aria-label={`View product: ${name}`}
      >
        <div className="relative overflow-hidden">
          <ProductImage
            src={product.primaryImage || product.images[0]}
            alt={name}
            className="transition-transform duration-500 group-hover:scale-[1.025]"
          />
          {(product.secondaryImage || product.images[1]) && (
            <div className="absolute inset-0 hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 sm:block">
              <ProductImage
                src={product.secondaryImage || product.images[1]}
                alt={`${name}, alternative view`}
              />
            </div>
          )}
        </div>
        <div className="space-y-3 border-t border-graphite p-5">
          <h3 className="font-display text-2xl uppercase">{name}</h3>
          {(product.objectCode || product.code) && (
            <p className="eyebrow text-steel">
              {product.objectCode || product.code}
            </p>
          )}
          {product.category && (
            <p className="text-sm text-steel">{product.category}</p>
          )}
          <p>{formatPrice(product.price, product.currency)}</p>
          <StatusBadge status={product.status} />
          <span className="block pt-3 text-sm uppercase">View product →</span>
        </div>
      </Link>
    </article>
  );
}
export function ProductCardPlaceholder() {
  return (
    <div className="border border-graphite" aria-hidden="true">
      <div className="aspect-[4/5] bg-onyx" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-2/3 bg-graphite" />
        <div className="h-2 w-1/3 bg-graphite" />
      </div>
    </div>
  );
}
