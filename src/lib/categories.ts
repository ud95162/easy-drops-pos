// Shared storefront categories. The website groups products by these slugs,
// so the POS stores a product's `category` as one of these slug values.
export const CATEGORIES = [
  { slug: "pantry-staples", name: "Pantry Staples" },
  { slug: "snacks-sweets", name: "Snacks & Sweets" },
  { slug: "beverages", name: "Beverages" },
  { slug: "household", name: "Household" },
  { slug: "personal-care", name: "Personal Care" },
  { slug: "dairy-products", name: "Dairy Products" },
  { slug: "baby-care", name: "Baby Care" },
  { slug: "pet-supplies", name: "Pet Supplies" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS: string[] = CATEGORIES.map((c) => c.slug);

/** Return the slug if it is a known category, otherwise null. */
export function normalizeCategory(value?: string | null): string | null {
  const v = (value ?? "").trim();
  return CATEGORY_SLUGS.includes(v) ? v : null;
}

/** Friendly display name for a category slug. */
export function categoryName(slug?: string | null): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? "";
}
