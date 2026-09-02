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
): { imageData?: Uint8Array<ArrayBuffer> | null; imageType?: string | null } {
  const dataUrl = str(formData, "imageData");
  const remove = str(formData, "imageRemove") === "1";

  const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (match) {
    const raw = Buffer.from(match[2], "base64");
    if (raw.byteLength > MAX_IMAGE_BYTES) return {}; // too big; skip
    const bytes = new Uint8Array(raw.byteLength);
    bytes.set(raw);
    return { imageType: match[1], imageData: bytes };
  }
  if (remove) return { imageData: null, imageType: null };
  return {};
}

function readFields(formData: FormData) {
  const name = str(formData, "name");
  const sinhalaName = str(formData, "sinhalaName");
  const type =
    str(formData, "type") === "LOOSE" ? ProductType.LOOSE : ProductType.PACKET;
  const unit =
    str(formData, "unit") || (type === ProductType.LOOSE ? "kg" : "pcs");
  const category = normalizeCategory(str(formData, "category"));
  const regularPrice = num(formData, "regularPrice");
  const salePrice = num(formData, "salePrice");
  const inStock = str(formData, "inStock") === "1";
  const active = str(formData, "active") === "1";
  return {
    name,
    sinhalaName,
    type,
    unit,
    category,
    regularPrice,
    salePrice,
    inStock,
    active,
  };
}

export async function createEcomProduct(
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();
  const f = readFields(formData);

  if (!f.name) return { ok: false, error: "Name is required." };
  if (!f.sinhalaName) return { ok: false, error: "Sinhala name is required." };
  if (f.regularPrice < 0 || f.salePrice < 0)
    return { ok: false, error: "Prices cannot be negative." };

  const image = readImage(formData);

  try {
    await prisma.ecomProduct.create({
      data: {
        name: f.name,
        sinhalaName: f.sinhalaName,
        type: f.type,
        unit: f.unit,
        category: f.category,
        regularPrice: f.regularPrice,
        salePrice: f.salePrice,
        inStock: f.inStock,
        active: f.active,
        ...(image.imageData !== undefined
          ? { imageData: image.imageData, imageType: image.imageType }
          : {}),
      },
    });
  } catch {
    return { ok: false, error: "Could not create the online product." };
  }

  revalidatePath("/store");
  return { ok: true };
}

export async function updateEcomProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();
  const f = readFields(formData);

  if (!f.name) return { ok: false, error: "Name is required." };
  if (!f.sinhalaName) return { ok: false, error: "Sinhala name is required." };
  if (f.regularPrice < 0 || f.salePrice < 0)
    return { ok: false, error: "Prices cannot be negative." };

  const image = readImage(formData);

  try {
    await prisma.ecomProduct.update({
      where: { id },
      data: {
        name: f.name,
        sinhalaName: f.sinhalaName,
        type: f.type,
        unit: f.unit,
        category: f.category,
        regularPrice: f.regularPrice,
        salePrice: f.salePrice,
        inStock: f.inStock,
        active: f.active,
        ...(image.imageData !== undefined
          ? { imageData: image.imageData, imageType: image.imageType }
          : {}),
      },
    });
  } catch {
    return { ok: false, error: "Could not update the online product." };
  }

  revalidatePath("/store");
  return { ok: true };
}

export async function setEcomActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  await requireAuth();
  await prisma.ecomProduct.update({ where: { id }, data: { active } });
  revalidatePath("/store");
  return { ok: true };
}

export async function setEcomInStock(
  id: string,
  inStock: boolean
): Promise<ActionResult> {
  await requireAuth();
  await prisma.ecomProduct.update({ where: { id }, data: { inStock } });
  revalidatePath("/store");
  return { ok: true };
}

export async function deleteEcomProduct(id: string): Promise<ActionResult> {
  await requireAuth();
  try {
    await prisma.ecomProduct.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Could not delete the online product." };
  }
  revalidatePath("/store");
  return { ok: true };
}

/**
 * One-time bootstrap: copy current POS inventory products into the online
 * catalog so the storefront isn't empty. Skips products already imported
 * (matched by name, case-insensitive) so it is safe to run more than once.
 * Copies the photo bytes too.
 */
export async function importFromPos(): Promise<
  ActionResult & { added?: number }
> {
  await requireAuth();

  const [posProducts, existing] = await Promise.all([
    // Need the image bytes, which are globally omitted — select explicitly.
    prisma.product.findMany({
      where: { active: true },
      select: {
        name: true,
        sinhalaName: true,
        type: true,
        unit: true,
        category: true,
        regularPrice: true,
        salePrice: true,
        stock: true,
        imageData: true,
        imageType: true,
      },
    }),
    prisma.ecomProduct.findMany({ select: { name: true } }),
  ]);

  const taken = new Set(existing.map((e) => e.name.trim().toLowerCase()));
  const toAdd = posProducts.filter(
    (p) => !taken.has(p.name.trim().toLowerCase())
  );
  if (toAdd.length === 0) return { ok: true, added: 0 };

  let added = 0;
  for (const p of toAdd) {
    const bytes = p.imageData
      ? (() => {
          const b = new Uint8Array(p.imageData.byteLength);
          b.set(p.imageData);
          return b;
        })()
      : null;
    await prisma.ecomProduct.create({
      data: {
        name: p.name,
        sinhalaName: p.sinhalaName,
        type: p.type,
        unit: p.unit,
        category: p.category,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        inStock: Number(p.stock) > 0,
        active: true,
        ...(bytes ? { imageData: bytes, imageType: p.imageType } : {}),
      },
    });
    added += 1;
  }

  revalidatePath("/store");
  return { ok: true, added };
}
