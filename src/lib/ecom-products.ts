import type { EcomProduct, ProductType } from "@prisma/client";
import { toNumber } from "./money";

export type SerializedEcomProduct = {
  id: string;
  name: string;
  sinhalaName: string;
  type: ProductType;
  unit: string;
  category: string | null;
  subcategory: string | null;
  regularPrice: number;
  salePrice: number;
  inStock: boolean;
  active: boolean;
  sortOrder: number;
  hasImage: boolean;
};

/** Convert a Prisma EcomProduct (Decimal fields) to a plain client-safe object. */
export function serializeEcomProduct(
  // imageData is globally omitted from queries; only imageType is read here.
  p: Omit<EcomProduct, "imageData">
): SerializedEcomProduct {
  return {
    id: p.id,
    name: p.name,
    sinhalaName: p.sinhalaName,
    type: p.type,
    unit: p.unit,
    category: p.category ?? null,
    subcategory: p.subcategory ?? null,
    regularPrice: toNumber(p.regularPrice),
    salePrice: toNumber(p.salePrice),
    inStock: p.inStock,
    active: p.active,
    sortOrder: p.sortOrder,
    hasImage: !!p.imageType,
  };
}
