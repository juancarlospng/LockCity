import "server-only";
import { WooCommerceAdapter } from "./commerce-core";
import { applyProductContent } from "./product-content";

export { CommerceError } from "./commerce-core";
const adapter = new WooCommerceAdapter(process.env.WC_STORE_URL);

export const commerce = {
  async getProducts() {
    return (await adapter.getProducts()).map(applyProductContent);
  },
  async getProductBySlug(slug: string) {
    const product = await adapter.getProductBySlug(slug);
    return product ? applyProductContent(product) : undefined;
  },
};
