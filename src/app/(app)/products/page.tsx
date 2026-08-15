import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/products";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return <ProductsClient products={products.map(serializeProduct)} />;
}
