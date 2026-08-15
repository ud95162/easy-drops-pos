"use server";

import { revalidatePath } from "next/cache";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export type ActionResult = { ok: boolean; error?: string };

function num(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireAuth();

  const name = str(formData, "name");
  const sinhalaName = str(formData, "sinhalaName");
  const type =
    str(formData, "type") === "LOOSE" ? ProductType.LOOSE : ProductType.PACKET;
  const unit = str(formData, "unit") || (type === ProductType.LOOSE ? "kg" : "pcs");
  const barcodeRaw = str(formData, "barcode");

  if (!name) return { ok: false, error: "Name is required." };
  if (!sinhalaName)
    return { ok: false, error: "Sinhala name is required (for the receipt)." };

  const costPrice = num(formData, "costPrice");
  const regularPrice = num(formData, "regularPrice");
  const salePrice = num(formData, "salePrice");
  const stock = num(formData, "stock");

  if (regularPrice < 0 || salePrice < 0 || costPrice < 0)
    return { ok: false, error: "Prices cannot be negative." };

  try {
    await prisma.product.create({
      data: {
        name,
        sinhalaName,
        type,
        unit,
        costPrice,
        regularPrice,
        salePrice: salePrice || regularPrice,
        stock,
        barcode: barcodeRaw || null,
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "That barcode is already used by another product." };
    }
    return { ok: false, error: "Could not create product." };
  }

  revalidatePath("/products");
  revalidatePath("/pos");
  return { ok: true };
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const name = str(formData, "name");
  const sinhalaName = str(formData, "sinhalaName");
  const type =
    str(formData, "type") === "LOOSE" ? ProductType.LOOSE : ProductType.PACKET;
  const unit = str(formData, "unit") || (type === ProductType.LOOSE ? "kg" : "pcs");
  const barcodeRaw = str(formData, "barcode");

  if (!name) return { ok: false, error: "Name is required." };
  if (!sinhalaName) return { ok: false, error: "Sinhala name is required." };

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name,
        sinhalaName,
        type,
        unit,
        costPrice: num(formData, "costPrice"),
        regularPrice: num(formData, "regularPrice"),
        salePrice: num(formData, "salePrice"),
        barcode: barcodeRaw || null,
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "That barcode is already used by another product." };
    }
    return { ok: false, error: "Could not update product." };
  }

  revalidatePath("/products");
  revalidatePath("/pos");
  return { ok: true };
}

export async function setProductActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  await requireAuth();
  await prisma.product.update({ where: { id }, data: { active } });
  revalidatePath("/products");
  revalidatePath("/pos");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAuth();
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    // If it has sales history, deactivate instead of hard-deleting.
    await prisma.product.update({ where: { id }, data: { active: false } });
    revalidatePath("/products");
    revalidatePath("/pos");
    return {
      ok: true,
      error: "Product has sales history, so it was deactivated instead of deleted.",
    };
  }
  revalidatePath("/products");
  revalidatePath("/pos");
  return { ok: true };
}
