"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { syncPacketProduct } from "@/lib/packet-sync";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Delete (void) a sale. The sold quantities are returned to stock for any
 * products that still exist.
 */
export async function deleteSale(id: string): Promise<ActionResult> {
  await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!sale) return;

      const packetsToSync = new Set<string>();
      for (const item of sale.items) {
        // A non-null batchId means this was a FIFO packet portion — return the
        // quantity to that exact batch. batchId is null for loose items (and
        // for packet sales made before batches existed), which decremented the
        // product's own stock.
        if (item.batchId) {
          await tx.productBatch.update({
            where: { id: item.batchId },
            data: { remaining: { increment: item.quantity } },
          });
          if (item.productId) packetsToSync.add(item.productId);
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      for (const productId of packetsToSync) {
        await syncPacketProduct(tx, productId);
      }

      // Reverse any credit this sale put on the customer's balance.
      if (sale.customerId && Number(sale.credit) > 0) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: sale.credit } },
        });
      }

      // Deleting the sale cascades to its items.
      await tx.sale.delete({ where: { id } });
    });
  } catch {
    return { ok: false, error: "Could not delete the sale." };
  }

  revalidatePath("/sales");
  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/customers");
  return { ok: true };
}
