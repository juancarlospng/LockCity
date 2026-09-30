import "server-only";
import { WooCommerceAdapter } from "./commerce-core";
import { applyProductContent } from "./product-content";
import { AW26_PRODUCT_IDS, AW26_VISIBLE } from "./merchandising";
import { getOperatorProducts } from "./operator-commerce";

export { CommerceError } from "./commerce-core";
const adapter = new WooCommerceAdapter(process.env.WC_STORE_URL);

export const commerce = {
  async getProducts() {
    const publicProducts = (await adapter.getProducts()).map(applyProductContent);
    if (!AW26_VISIBLE) return publicProducts;
    const aw26 = await getOperatorProducts(AW26_PRODUCT_IDS);
    const byId = new Map(publicProducts.map((product) => [product.wooProductId, product]));
    for (const product of aw26) byId.set(product.wooProductId, product);
    return [...byId.values()];
  },
  async getProductBySlug(slug: string) {
    const product = await adapter.getProductBySlug(slug);
    if (product) return applyProductContent(product);
    if (!AW26_VISIBLE) return undefined;
    return (await getOperatorProducts(AW26_PRODUCT_IDS)).find((item) => item.slug === slug);
  },
};
