import { CommerceError } from "@/lib/commerce";

export function CatalogError({ error }: { error: unknown }) {
  const kind = error instanceof CommerceError ? error.kind : "woocommerce";
  const message = {
    network: "We’re having trouble loading the store. Please try again shortly.",
    woocommerce: "We’re having trouble loading the catalog. Please try again shortly.",
    configuration: "The catalog is temporarily unavailable. Please try again shortly.",
  }[kind];
  return <section role="alert" data-testid={`catalog-error-${kind}`} className="px-4 pb-24 pt-40 sm:px-8 lg:px-12">
    <h1 className="font-display text-4xl uppercase text-bone">Catalog temporarily unavailable</h1>
    <p className="mt-6 text-sm text-steel">{message}</p>
    <a href="" className="mt-8 inline-block text-xs uppercase underline text-bone">Try again</a>
  </section>;
}
