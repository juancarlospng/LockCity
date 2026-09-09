import { ShopGrid } from "@/components/ShopGrid";
import { commerce } from "@/lib/commerce";
export const metadata = { title: "Shop — Lock City Clothes" };
export default async function ShopPage() {
  return (
    <div data-testid="shop-page" className="page-shell">
      <p className="eyebrow text-steel">Clothing & streetwear</p>
      <h1 className="page-title">Shop Lock City</h1>
      <ShopGrid products={await commerce.getProducts()} />
    </div>
  );
}
