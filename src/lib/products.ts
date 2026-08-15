import type { Product, ProductType } from "@prisma/client";
import { toNumber } from "./money";

export type SerializedProduct = {
  id: string;
  name: string;
  sinhalaName: string;
  type: ProductType;
  unit: string;
  costPrice: number;
  regularPrice: number;
  salePrice: number;
  stock: number;
  barcode: string | null;
  active: boolean;
};

/** Convert a Prisma Product (with Decimal fields) to a plain client-safe object. */
export function serializeProduct(p: Product): SerializedProduct {
  return {
    id: p.id,
    name: p.name,
    sinhalaName: p.sinhalaName,
    type: p.type,
    unit: p.unit,
    costPrice: toNumber(p.costPrice),
    regularPrice: toNumber(p.regularPrice),
    salePrice: toNumber(p.salePrice),
    stock: toNumber(p.stock),
    barcode: p.barcode,
    active: p.active,
  };
}
