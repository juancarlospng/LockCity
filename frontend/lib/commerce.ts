import "server-only";
import { WooCommerceAdapter } from "./commerce-core";

export { CommerceError } from "./commerce-core";
export const commerce = new WooCommerceAdapter(process.env.WC_STORE_URL);
