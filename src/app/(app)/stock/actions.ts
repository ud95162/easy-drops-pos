"use server";

import { revalidatePath } from "next/cache";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { syncPacketProduct } from "@/lib/packet-sync";

export type ActionResult = { ok: boolean; error?: string };

function num(formData: FormData, key: string): number {
  const n = Number(String(formData.get(key) ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

export async function addStock(formData: FormData): Promise<ActionResult> {
  await requireAuth();

  const productId = String(formData.get("productId") ?? "");
  const quantity = num(formData, "quantity");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!productId) return { ok: false, error: "Please choose a product." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { ok: false, error: "Enter a quantity greater than zero." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "Product not found." };

  const isLoose = product.type === ProductType.LOOSE;

  // Both loose and packet stock-ins now carry their own cost/regular/sale price.
  // - LOOSE: the new prices replace the product's current prices.
  // - PACKET: the new stock becomes its own priced batch (sold FIFO after
  //   existing batches).
  const costPrice = num(formData, "costPrice");
  const regularPrice = num(formData, "regularPrice");
  const salePrice = num(formData, "salePrice");

  if (
    !Number.isFinite(costPrice) ||
    !Number.isFinite(regularPrice) ||
    !Number.isFinite(salePrice)
  ) {
    return {
      ok: false,
      error: "Enter cost, regular and sale prices for the new stock.",
    };
  }
  if (costPrice < 0 || regularPrice < 0 || salePrice < 0)
    return { ok: false, error: "Prices cannot be negative." };

  await prisma.$transaction(async (tx) => {
    // History log (both types).
    await tx.stockEntry.create({
      data: { productId, quantity, costPrice, regularPrice, salePrice, note },
    });

    if (isLoose) {
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: { increment: quantity },
          costPrice,
          regularPrice,
          salePrice,
        },
      });
    } else {
      // New priced batch for the packet.
      await tx.productBatch.create({
        data: {
          productId,
          costPrice,
          regularPrice,
          salePrice,
          quantity,
          remaining: quantity,
        },
      });
      await syncPacketProduct(tx, productId);
    }
  });

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/pos");
  return { ok: true };
}
