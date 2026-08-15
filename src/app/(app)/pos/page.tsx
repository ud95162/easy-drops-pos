import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/products";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return <PosClient products={products.map(serializeProduct)} />;
}
