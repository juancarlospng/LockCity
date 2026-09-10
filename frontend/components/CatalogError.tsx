import { CommerceError } from "@/lib/commerce";

export function CatalogError({ error }: { error: unknown }) {
  const kind = error instanceof CommerceError ? error.kind : "woocommerce";
  const message = {
    network: "We could not connect to the store. Please try again.",
    woocommerce: "The store could not return its catalog. Please try again.",
    configuration: "The store connection is not configured yet.",
  }[kind];
  return <section role="alert" data-testid={`catalog-error-${kind}`} className="px-4 pb-24 pt-40 sm:px-8 lg:px-12">
    <h1 className="font-display text-4xl uppercase text-bone">Catalog temporarily unavailable</h1>
    <p className="mt-6 text-sm text-steel">{message}</p>
    <a href="" className="mt-8 inline-block text-xs uppercase underline text-bone">Try again</a>
  </section>;
}
