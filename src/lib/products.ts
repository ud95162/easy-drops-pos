import type { Product, ProductBatch, ProductType } from "@prisma/client";
import { toNumber } from "./money";
import type { BatchLite } from "./batches";

export type SerializedProduct = {
  id: string;
  name: string;
  sinhalaName: string;
  type: ProductType;
  unit: string;
  category: string | null;
  costPrice: number;
  regularPrice: number;
  salePrice: number;
  stock: number;
  barcode: string | null;
  active: boolean;
  hasImage: boolean;
  // For PACKET items: priced stock batches, oldest first (only those with stock).
  batches: (BatchLite & { costPrice: number; quantity: number })[];
};

/** Convert a Prisma Product (with Decimal fields) to a plain client-safe object. */
export function serializeProduct(
  p: Product & { batches?: ProductBatch[] }
): SerializedProduct {
  const batches = (p.batches ?? [])
    .filter((b) => toNumber(b.remaining) > 0)
    .map((b) => ({
      id: b.id,
      salePrice: toNumber(b.salePrice),
      regularPrice: toNumber(b.regularPrice),
      costPrice: toNumber(b.costPrice),
      remaining: toNumber(b.remaining),
      quantity: toNumber(b.quantity),
    }));

  return {
    id: p.id,
    name: p.name,
    sinhalaName: p.sinhalaName,
    type: p.type,
    unit: p.unit,
    category: p.category ?? null,
    costPrice: toNumber(p.costPrice),
    regularPrice: toNumber(p.regularPrice),
    salePrice: toNumber(p.salePrice),
    stock: toNumber(p.stock),
    barcode: p.barcode,
    active: p.active,
    hasImage: !!p.imageType,
    batches,
  };
}
