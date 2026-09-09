// Districts are the site's structural information architecture, not data.
// Products inside districts always come from the commerce adapter.
export interface District {
  slug: string;
  index: string;
  name: string;
  description: string;
}

export const DISTRICTS: District[] = [
  {
    slug: "core",
    index: "01",
    name: "CORE",
    description: "The permanent collection.",
  },
  { slug: "drop", index: "02", name: "DROP", description: "Limited releases." },
  {
    slug: "collab",
    index: "03",
    name: "COLLAB",
    description: "Shared perspectives. Collaborations.",
  },
  {
    slug: "archive",
    index: "04",
    name: "ARCHIVE",
    description: "Past seasons and historical releases.",
  },
];
