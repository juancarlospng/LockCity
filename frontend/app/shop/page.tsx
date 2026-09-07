import { EmptyState } from "@/components/EmptyState";
import { MaskText } from "@/components/Reveal";
import { ShopGrid } from "@/components/ShopGrid";
import { commerce } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await commerce.getProducts();

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
            title="The first drop is coming"
            body="The shop opens with the first drop. Join the city and the signal reaches you first."
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
