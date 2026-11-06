import "server-only";
import { WooCommerceAdapter } from "./commerce-core";
import { applyProductContent } from "./product-content";
import { AW26_PRODUCT_IDS, AW26_VISIBLE, isActiveDropProduct, relatedStoreProductIds, relatedStoreProducts } from "./merchandising";
import { getOperatorCatalog, getOperatorProductBySlug, getOperatorProducts } from "./operator-commerce";
import type { Product } from "./types";

export { CommerceError } from "./commerce-core";
const adapter = new WooCommerceAdapter(process.env.WC_STORE_URL);

function catalogSummary(product: Product): Product {
  return product.previewOnly && product.type === "variable" ? { ...product, variants: [] } : product;
}

export const commerce = {
  async getProducts() {
    const publicProducts = (await adapter.getProducts()).map(applyProductContent);
    if (!AW26_VISIBLE) return publicProducts;
    const aw26 = await getOperatorCatalog(AW26_PRODUCT_IDS);
    const byId = new Map(publicProducts.map((product) => [product.wooProductId, product]));
    for (const product of aw26) byId.set(product.wooProductId, product);
    return [...byId.values()].map(catalogSummary);
  },
  async getProductBySlug(slug: string) {
    const product = await adapter.getProductBySlug(slug);
    if (product) return applyProductContent(product);
    if (!AW26_VISIBLE) return undefined;
    return getOperatorProductBySlug(slug);
  },
  async getRelatedProducts(product: Product) {
    const ids = relatedStoreProductIds(product);
    if (isActiveDropProduct(product.wooProductId)) {
      return (await getOperatorProducts(ids)).map(catalogSummary);
    }
    return relatedStoreProducts(product, await this.getProducts());
  },
};
