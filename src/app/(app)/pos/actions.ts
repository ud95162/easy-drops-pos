"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { round2, toNumber } from "@/lib/money";

export type CartLine = { productId: string; quantity: number };

export type ReceiptItem = {
  name: string;
  sinhalaName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Receipt = {
  id: string;
  createdAt: string;
  total: number;
  paid: number;
  change: number;
  items: ReceiptItem[];
};

export type SaleResult =
  | { ok: true; receipt: Receipt }
  | { ok: false; error: string };

export async function createSale(
  lines: CartLine[],
  paid: number
): Promise<SaleResult> {
  await requireAuth();

  const valid = lines.filter((l) => l.productId && l.quantity > 0);
  if (valid.length === 0) return { ok: false, error: "The cart is empty." };

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: valid.map((l) => l.productId) } },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const items: ReceiptItem[] = [];
      let total = 0;

      for (const line of valid) {
        const product = byId.get(line.productId);
        if (!product) {
          throw new Error("A product in the cart no longer exists.");
        }
        const available = toNumber(product.stock);
        if (line.quantity > available) {
          throw new Error(
            `Not enough stock for ${product.name}. Available: ${available} ${product.unit}.`
          );
        }

        const unitPrice = toNumber(product.salePrice);
        const lineTotal = round2(unitPrice * line.quantity);
        total = round2(total + lineTotal);

        items.push({
          name: product.name,
          sinhalaName: product.sinhalaName,
          unit: product.unit,
          quantity: line.quantity,
          unitPrice,
          lineTotal,
        });
      }

      const change = round2(Math.max(0, (paid || 0) - total));

      const sale = await tx.sale.create({
        data: {
          total,
          paid: paid || total,
          change,
          items: {
            create: valid.map((line, i) => ({
              productId: line.productId,
              productName: items[i].name,
              productSinhalaName: items[i].sinhalaName,
              unit: items[i].unit,
              quantity: line.quantity,
              unitPrice: items[i].unitPrice,
              lineTotal: items[i].lineTotal,
            })),
          },
        },
      });

      // Decrement stock for each product.
      for (const line of valid) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        });
      }

      return {
        id: sale.id,
        createdAt: sale.createdAt.toISOString(),
        total,
        paid: paid || total,
        change,
        items,
      } satisfies Receipt;
    });

    revalidatePath("/pos");
    revalidatePath("/products");
    revalidatePath("/sales");
    return { ok: true, receipt };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Could not complete the sale.";
    return { ok: false, error: message };
  }
}
