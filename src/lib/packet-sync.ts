import "server-only";
import type { Prisma } from "@prisma/client";
import { toNumber } from "./money";

/**
 * Recompute a PACKET product's stock and "current" prices from its batches.
 * - stock = sum of all batch.remaining
 * - current prices = the oldest batch that still has stock (FIFO front)
 */
export async function syncPacketProduct(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<void> {
  const batches = await tx.productBatch.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });

  const stock = batches.reduce((sum, b) => sum + toNumber(b.remaining), 0);
  const current = batches.find((b) => toNumber(b.remaining) > 0);

  await tx.product.update({
    where: { id: productId },
    data: {
      stock,
      ...(current
        ? {
            costPrice: current.costPrice,
            regularPrice: current.regularPrice,
            salePrice: current.salePrice,
          }
        : {}),
    },
  });
}
