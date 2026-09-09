import Link from "@/components/StoreLink";
import { commerce } from "@/lib/commerce";
import { ProductGrid } from "@/components/ShopGrid";
import { EmptyState } from "@/components/EmptyState";
import { EMPTY_COPY } from "@/lib/content";
export async function SelectedObjects() {
  const products = (await commerce.getProducts()).filter((p) => p.heroProduct);
  return (
    <section
      className="section-space border-t border-graphite"
      aria-labelledby="selected-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="selected-title" className="section-title">
          Selected objects
        </h2>
        <Link href="/shop" className="lc-button">
          Shop Lock City →
        </Link>
      </div>
      <div className="mt-10">
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            kicker="Clothing & objects"
            {...EMPTY_COPY.shop}
            testid="selected-empty-state"
          />
        )}
      </div>
    </section>
  );
}
