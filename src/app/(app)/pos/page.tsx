import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/products";
import { serializeCustomer } from "@/lib/customers";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        batches: {
          where: { remaining: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <PosClient
      products={products.map(serializeProduct)}
      customers={customers.map(serializeCustomer)}
    />
  );
}
