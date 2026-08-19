"use server";

import { revalidatePath } from "next/cache";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { normalizeCategory } from "@/lib/categories";

export type ActionResult = { ok: boolean; error?: string };

function num(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB safety cap

/**
 * Read the uploaded photo from the form.
 * - { imageData, imageType } when a new photo was chosen
 * - { imageData: null, imageType: null } when the photo was removed
 * - {} when unchanged (nothing to write)
 */
function readImage(
  formData: FormData
): { imageData?: Buffer | null; imageType?: string | null } {
  const dataUrl = str(formData, "imageData");
  const remove = str(formData, "imageRemove") === "1";

  const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (match) {
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_IMAGE_BYTES) return {}; // too big; skip
    return { imageType: match[1], imageData: buffer };
  }
  if (remove) return { imageData: null, imageType: null };
  return {};
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireAuth();

  const name = str(formData, "name");
  const sinhalaName = str(formData, "sinhalaName");
  const type =
    str(formData, "type") === "LOOSE" ? ProductType.LOOSE : ProductType.PACKET;
  const unit = str(formData, "unit") || (type === ProductType.LOOSE ? "kg" : "pcs");
  const barcodeRaw = str(formData, "barcode");
  const category = normalizeCategory(str(formData, "category"));

  if (!name) return { ok: false, error: "Name is required." };
  if (!sinhalaName)
    return { ok: false, error: "Sinhala name is required (for the receipt)." };

  const costPrice = num(formData, "costPrice");
  const regularPrice = num(formData, "regularPrice");
  const salePrice = num(formData, "salePrice");
  const stock = num(formData, "stock");

  if (regularPrice < 0 || salePrice < 0 || costPrice < 0)
    return { ok: false, error: "Prices cannot be negative." };

  const effectiveSale = salePrice || regularPrice;
  const image = readImage(formData);

  try {
    await prisma.product.create({
      data: {
        name,
        sinhalaName,
        type,
        unit,
        category,
        ...(image.imageData !== undefined
          ? { imageData: image.imageData, imageType: image.imageType }
          : {}),
        costPrice,
        regularPrice,
        salePrice: effectiveSale,
        stock,
        barcode: barcodeRaw || null,
        // A packet with opening stock starts as its first priced batch.
        ...(type === ProductType.PACKET && stock > 0
          ? {
              batches: {
                create: {
                  costPrice,
                  regularPrice,
                  salePrice: effectiveSale,
                  quantity: stock,
                  remaining: stock,
                },
              },
            }
          : {}),
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
  const category = normalizeCategory(str(formData, "category"));

  if (!name) return { ok: false, error: "Name is required." };
  if (!sinhalaName) return { ok: false, error: "Sinhala name is required." };

  const costPrice = num(formData, "costPrice");
  const regularPrice = num(formData, "regularPrice");
  const salePrice = num(formData, "salePrice");
  const image = readImage(formData);

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name,
        sinhalaName,
        type,
        unit,
        category,
        costPrice,
        regularPrice,
        salePrice,
        barcode: barcodeRaw || null,
        ...(image.imageData !== undefined
          ? { imageData: image.imageData, imageType: image.imageType }
          : {}),
      },
    });

    // For a packet, the "current" price lives on its oldest in-stock batch —
    // keep it in sync so an edit here isn't overwritten on the next restock.
    if (type === ProductType.PACKET) {
      const current = await prisma.productBatch.findFirst({
        where: { productId: id, remaining: { gt: 0 } },
        orderBy: { createdAt: "asc" },
      });
      if (current) {
        await prisma.productBatch.update({
          where: { id: current.id },
          data: { costPrice, regularPrice, salePrice },
        });
      }
    }
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
