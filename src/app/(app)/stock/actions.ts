"use server";

import { revalidatePath } from "next/cache";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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

  // For loose items the new batch prices replace the product's current prices.
  // For packet items the prices stay as they are.
  let costPrice = Number(product.costPrice);
  let regularPrice: number | null = null;
  let salePrice: number | null = null;

  if (isLoose) {
    const newCost = num(formData, "costPrice");
    const newRegular = num(formData, "regularPrice");
    const newSale = num(formData, "salePrice");

    if (
      !Number.isFinite(newCost) ||
      !Number.isFinite(newRegular) ||
      !Number.isFinite(newSale)
    ) {
      return { ok: false, error: "Enter cost, regular and sale prices for the new stock." };
    }
    if (newCost < 0 || newRegular < 0 || newSale < 0)
      return { ok: false, error: "Prices cannot be negative." };

    costPrice = newCost;
    regularPrice = newRegular;
    salePrice = newSale;
  }

  await prisma.$transaction(async (tx) => {
    await tx.stockEntry.create({
      data: {
        productId,
        quantity,
        costPrice,
        regularPrice,
        salePrice,
        note,
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: quantity },
        ...(isLoose && regularPrice != null && salePrice != null
          ? { costPrice, regularPrice, salePrice }
          : {}),
      },
    });
  });

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/pos");
  return { ok: true };
}
