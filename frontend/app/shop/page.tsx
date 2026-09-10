import { EmptyState } from "@/components/EmptyState";
import { MaskText } from "@/components/Reveal";
import { ShopGrid } from "@/components/ShopGrid";
import { commerce } from "@/lib/commerce";
import { CatalogError } from "@/components/CatalogError";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  let products;
  try { products = await commerce.getProducts(); }
  catch (error) { return <CatalogError error={error} />; }

  return (
    <div
      data-testid="shop-page"
      className="px-4 pb-24 pt-32 sm:px-8 lg:px-12 lg:pt-40"
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-steel">All products</p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.85] text-bone sm:text-8xl lg:text-9xl">
        <MaskText lines={["Shop"]} />
      </h1>

      {products.length === 0 ? (
        <div className="mt-16">
          <EmptyState
            testid="shop-empty-state"
            kicker="The store"
            title="No products published yet"
            body="The store is connected, but there are no published products to show."
            ctaHref="/#join"
            ctaLabel="Join the city →"
          />
        </div>
      ) : (
        <ShopGrid products={products} />
      )}
    </div>
  );
}
