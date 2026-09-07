// Districts are the site's structural information architecture, not data.
// Products inside districts always come from the commerce adapter.
export interface District {
  slug: string;
  index: string;
  name: string;
}

export const DISTRICTS: District[] = [
  { slug: "core", index: "01", name: "CORE" },
  { slug: "drop", index: "02", name: "DROP" },
  { slug: "collab", index: "03", name: "COLLAB" },
  { slug: "archive", index: "04", name: "ARCHIVE" },
];
