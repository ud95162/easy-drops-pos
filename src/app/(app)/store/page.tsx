import { prisma } from "@/lib/prisma";
import { serializeEcomProduct } from "@/lib/ecom-products";
import { StoreClient } from "./store-client";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await prisma.ecomProduct.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return <StoreClient products={products.map(serializeEcomProduct)} />;
}
