// Shared storefront taxonomy. The website + app group products by these
// category slugs; each category has a hardcoded list of subcategories.
// The POS stores a product's `category` (and optional `subcategory`) as
// one of these slug values.

export type Subcategory = { slug: string; name: string };
export type Category = { slug: string; name: string; subs: Subcategory[] };

export const CATEGORIES: Category[] = [
  {
    slug: "beverages-snacks",
    name: "Beverages & Snacks",
    subs: [
      { slug: "soft-drinks", name: "Soft Drinks" },
      { slug: "juices-cordials", name: "Juices & Cordials" },
      { slug: "water", name: "Water" },
      { slug: "tea-coffee", name: "Tea & Coffee" },
      { slug: "chips-crisps", name: "Chips & Crisps" },
      { slug: "biscuits-cookies", name: "Biscuits & Cookies" },
      { slug: "chocolates-candy", name: "Chocolates & Candy" },
      { slug: "noodles-pasta", name: "Noodles & Pasta" },
      { slug: "nuts-dried-fruit", name: "Nuts & Dried Fruit" },
    ],
  },
  {
    slug: "grocery",
    name: "Grocery",
    subs: [
      { slug: "rice-grains", name: "Rice & Grains" },
      { slug: "flour-baking", name: "Flour & Baking" },
      { slug: "sugar-sweeteners", name: "Sugar & Sweeteners" },
      { slug: "dhal-pulses", name: "Dhal & Pulses" },
      { slug: "oil-ghee", name: "Cooking Oil & Ghee" },
      { slug: "spices-masala", name: "Spices & Masala" },
      { slug: "sauces-condiments", name: "Sauces & Condiments" },
      { slug: "canned-jarred", name: "Canned & Jarred" },
      { slug: "dairy", name: "Dairy" },
      { slug: "eggs", name: "Eggs" },
      { slug: "breakfast-cereals", name: "Breakfast & Cereals" },
    ],
  },
  {
    slug: "vegetables-fruits",
    name: "Vegetables & Fruits",
    subs: [
      { slug: "fresh-vegetables", name: "Fresh Vegetables" },
      { slug: "leafy-greens", name: "Leafy Greens" },
      { slug: "fresh-fruits", name: "Fresh Fruits" },
      { slug: "herbs", name: "Herbs" },
      { slug: "exotic-imported", name: "Exotic & Imported" },
    ],
  },
  {
    slug: "frozen-desserts",
    name: "Frozen & Desserts",
    subs: [
      { slug: "ice-cream", name: "Ice Cream" },
      { slug: "frozen-snacks", name: "Frozen Snacks" },
      { slug: "frozen-meat-seafood", name: "Frozen Meat & Seafood" },
      { slug: "frozen-vegetables", name: "Frozen Vegetables" },
      { slug: "cakes-pastries", name: "Cakes & Pastries" },
      { slug: "yoghurt-curd", name: "Yoghurt & Curd" },
    ],
  },
  {
    slug: "gifts-lifestyle",
    name: "Gifts & Lifestyle",
    subs: [
      { slug: "stationery", name: "Stationery" },
      { slug: "toys-games", name: "Toys & Games" },
      { slug: "books", name: "Books" },
      { slug: "greeting-cards", name: "Greeting Cards" },
      { slug: "party-supplies", name: "Party Supplies" },
      { slug: "flowers", name: "Flowers" },
    ],
  },
  {
    slug: "prepared-food",
    name: "Prepared Food",
    subs: [
      { slug: "ready-meals", name: "Ready Meals" },
      { slug: "short-eats", name: "Short Eats" },
      { slug: "bakery-bread", name: "Bakery & Bread" },
      { slug: "sandwiches-wraps", name: "Sandwiches & Wraps" },
      { slug: "cafe-beverages", name: "Cafe & Beverages" },
    ],
  },
  {
    slug: "health-personal-care",
    name: "Health & Personal Care",
    subs: [
      { slug: "bath-body", name: "Bath & Body" },
      { slug: "hair-care", name: "Hair Care" },
      { slug: "oral-care", name: "Oral Care" },
      { slug: "skin-care", name: "Skin Care" },
      { slug: "feminine-care", name: "Feminine Care" },
      { slug: "baby-care", name: "Baby Care" },
      { slug: "health-wellness", name: "Health & Wellness" },
      { slug: "deodorants-fragrance", name: "Deodorants & Fragrance" },
    ],
  },
  {
    slug: "household-essentials",
    name: "Household & Essentials",
    subs: [
      { slug: "cleaning-supplies", name: "Cleaning Supplies" },
      { slug: "laundry-care", name: "Laundry Care" },
      { slug: "paper-tissues", name: "Paper & Tissues" },
      { slug: "air-care", name: "Air Care" },
      { slug: "pest-control", name: "Pest Control" },
      { slug: "kitchen-essentials", name: "Kitchen Essentials" },
      { slug: "pet-supplies", name: "Pet Supplies" },
    ],
  },
  {
    slug: "storage-others",
    name: "Storage and others",
    subs: [
      { slug: "food-containers", name: "Food Containers" },
      { slug: "kitchenware", name: "Kitchenware" },
      { slug: "bins-baskets", name: "Bins & Baskets" },
      { slug: "bags-wraps", name: "Bags & Wraps" },
      { slug: "batteries-bulbs", name: "Batteries & Bulbs" },
    ],
  },
  {
    slug: "umbrellas-accessories",
    name: "Umbrellas & Accessories",
    subs: [
      { slug: "umbrellas", name: "Umbrellas" },
      { slug: "raincoats", name: "Raincoats" },
      { slug: "bags", name: "Bags" },
      { slug: "personal-accessories", name: "Personal Accessories" },
    ],
  },
];

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

/** Subcategories for a category slug (empty if unknown). */
export function subcategoriesOf(categorySlug?: string | null): Subcategory[] {
  return CATEGORIES.find((c) => c.slug === categorySlug)?.subs ?? [];
}

/** Return the sub slug only if it belongs to the given category. */
export function normalizeSubcategory(
  categorySlug?: string | null,
  sub?: string | null
): string | null {
  const v = (sub ?? "").trim();
  if (!v) return null;
  return subcategoriesOf(categorySlug).some((s) => s.slug === v) ? v : null;
}

/** Friendly display name for a subcategory slug within a category. */
export function subcategoryName(
  categorySlug?: string | null,
  sub?: string | null
): string {
  return subcategoriesOf(categorySlug).find((s) => s.slug === sub)?.name ?? "";
}
