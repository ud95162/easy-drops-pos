"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { round2, toNumber } from "@/lib/money";
import { syncPacketProduct } from "@/lib/packet-sync";

export type CartLine = {
  productId: string;
  quantity: number;
  unitPrice?: number; // cashier-set price; defaults to the product's sale price
  batchId?: string | null; // which packet batch to sell from
};

export type ReceiptItem = {
  name: string;
  sinhalaName: string;
  unit: string;
  quantity: number;
  regularPrice: number; // normal price
  unitPrice: number; // "Ape Milla" (our price) actually charged
  lineTotal: number;
};

export type Receipt = {
  id: string;
  createdAt: string;
  total: number; // total at Ape Milla (what the customer pays)
  regularTotal: number; // total at regular price
  savings: number; // regularTotal - total
  paid: number;
  change: number;
  credit: number; // unpaid amount put on the customer's account
  customerName: string | null;
  customerBalance: number | null; // customer's total balance after this sale
  items: ReceiptItem[];
};

export type SaleResult =
  | { ok: true; receipt: Receipt }
  | { ok: false; error: string };

export async function createSale(
  lines: CartLine[],
  paid: number,
  customerId?: string | null
): Promise<SaleResult> {
  await requireAuth();

  const valid = lines.filter((l) => l.productId && l.quantity > 0);
  if (valid.length === 0) return { ok: false, error: "The cart is empty." };

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: valid.map((l) => l.productId) } },
        include: {
          batches: {
            where: { remaining: { gt: 0 } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const items: ReceiptItem[] = [];
      const saleItemsData: Prisma.SaleItemUncheckedCreateWithoutSaleInput[] = [];
      const packetsToSync = new Set<string>();
      let total = 0;
      let regularTotal = 0;

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

        // For a packet, the cost/regular/sale prices come from the batch the
        // cashier chose (falls back to the front batch, then the product).
        let batch: (typeof product.batches)[number] | null = null;
        if (product.type === "PACKET" && product.batches.length > 0) {
          batch = line.batchId
            ? product.batches.find((b) => b.id === line.batchId) ?? null
            : product.batches[0];
          if (!batch) {
            throw new Error(`Choose a stock batch for ${product.name}.`);
          }
          if (line.quantity > toNumber(batch.remaining)) {
            throw new Error(
              `Only ${toNumber(batch.remaining)} ${product.unit} left in that batch of ${product.name}.`
            );
          }
        }

        const costPrice = toNumber(batch?.costPrice ?? product.costPrice);
        const regularPrice = toNumber(batch?.regularPrice ?? product.regularPrice);
        // The cashier sets the price when adding; fall back to the batch/product
        // sale price.
        const unitPrice = round2(
          Math.max(
            0,
            line.unitPrice ?? toNumber(batch?.salePrice ?? product.salePrice)
          )
        );
        const lineTotal = round2(unitPrice * line.quantity);
        total = round2(total + lineTotal);
        regularTotal = round2(regularTotal + regularPrice * line.quantity);

        // One receipt line per cart item.
        items.push({
          name: product.name,
          sinhalaName: product.sinhalaName,
          unit: product.unit,
          quantity: line.quantity,
          regularPrice,
          unitPrice,
          lineTotal,
        });

        const saleItem = {
          productId: product.id,
          batchId: batch?.id ?? null,
          productName: product.name,
          productSinhalaName: product.sinhalaName,
          unit: product.unit,
          costPrice,
          regularPrice,
          unitPrice,
          quantity: line.quantity,
          lineTotal,
        };
        saleItemsData.push(saleItem);

        if (batch) {
          await tx.productBatch.update({
            where: { id: batch.id },
            data: { remaining: { decrement: line.quantity } },
          });
          packetsToSync.add(product.id);
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: line.quantity } },
          });
        }
      }

      const effectivePaid = round2(Math.max(0, paid));
      const change = round2(Math.max(0, effectivePaid - total));
      const credit = round2(Math.max(0, total - effectivePaid));
      const savings = round2(Math.max(0, regularTotal - total));

      if (credit > 0 && !customerId) {
        throw new Error(
          "Select a customer for a credit (unpaid) sale, or collect the full amount."
        );
      }

      const sale = await tx.sale.create({
        data: {
          total,
          paid: effectivePaid,
          change,
          credit,
          customerId: customerId || null,
          items: { create: saleItemsData },
        },
      });

      // Recompute stock + current price for every packet we drew from.
      for (const productId of packetsToSync) {
        await syncPacketProduct(tx, productId);
      }

      // Attribute any unpaid amount to the customer's running balance.
      let customerName: string | null = null;
      let customerBalance: number | null = null;
      if (customerId) {
        const customer =
          credit > 0
            ? await tx.customer.update({
                where: { id: customerId },
                data: { balance: { increment: credit } },
              })
            : await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error("Selected customer not found.");
        customerName = customer.name;
        customerBalance = toNumber(customer.balance);
      }

      return {
        id: sale.id,
        createdAt: sale.createdAt.toISOString(),
        total,
        regularTotal,
        savings,
        paid: effectivePaid,
        change,
        credit,
        customerName,
        customerBalance,
        items,
      } satisfies Receipt;
    });

    revalidatePath("/pos");
    revalidatePath("/products");
    revalidatePath("/sales");
    revalidatePath("/customers");
    return { ok: true, receipt };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Could not complete the sale.";
    return { ok: false, error: message };
  }
}
