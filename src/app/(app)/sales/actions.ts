"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Delete (void) a sale. The sold quantities are returned to stock for any
 * products that still exist.
 */
export async function deleteSale(id: string): Promise<ActionResult> {
  await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      const items = await tx.saleItem.findMany({ where: { saleId: id } });

      for (const item of items) {
        // productId is null only if the product was deleted (onDelete: SetNull).
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
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
  return { ok: true };
}
