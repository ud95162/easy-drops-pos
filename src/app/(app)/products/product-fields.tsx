"use client";

import { useRef, useState } from "react";
import type { SerializedProduct } from "@/lib/products";
import { CATEGORIES } from "@/lib/categories";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/** Resize + JPEG-compress an image file in the browser, returning a data URL. */
function compressImage(
  file: File,
  maxSize = 800,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Photo picker with preview + client-side compression. */
function ImagePicker({
  productId,
  hasImage,
}: {
  productId?: string;
  hasImage?: boolean;
}) {
  const existing = hasImage && productId ? `/api/products/${productId}/image` : null;
  const [preview, setPreview] = useState<string | null>(existing);
  const [dataUrl, setDataUrl] = useState(""); // new (compressed) image
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      setDataUrl(compressed);
      setPreview(compressed);
      setRemove(false);
    } catch {
      // ignore; keep previous preview
    } finally {
      setBusy(false);
    }
  }

  function onRemove() {
    setDataUrl("");
    setPreview(null);
    setRemove(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        Product photo (website)
      </span>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50 text-slate-300">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">🖼️</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            {busy ? "Processing…" : preview ? "Change photo" : "Upload photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onRemove}
              className="text-left text-xs font-medium text-red-500 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />
      {/* Submitted to the server action */}
      <input type="hidden" name="imageData" value={dataUrl} />
      <input type="hidden" name="imageRemove" value={remove ? "1" : ""} />
    </div>
  );
}

/** The shared set of product inputs, used by both the create page and edit modal. */
export function ProductFields({
  product,
  includeStock,
}: {
  product?: SerializedProduct;
  includeStock: boolean;
}) {
  const [type, setType] = useState<"LOOSE" | "PACKET">(
    product?.type ?? "PACKET"
  );

  return (
    <div className="space-y-4">
      <ImagePicker productId={product?.id} hasImage={product?.hasImage} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name (English)">
          <input
            name="name"
            defaultValue={product?.name}
            required
            className={inputClass}
            placeholder="Sugar"
          />
        </Field>
        <Field label="Sinhala name (receipt)">
          <input
            name="sinhalaName"
            defaultValue={product?.sinhalaName}
            required
            className={inputClass}
            placeholder="සීනි"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type">
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as "LOOSE" | "PACKET")}
            className={inputClass}
          >
            <option value="PACKET">Packet (fixed price)</option>
            <option value="LOOSE">Loose (price updates with stock)</option>
          </select>
        </Field>
        <Field label="Unit">
          <input
            name="unit"
            defaultValue={product?.unit ?? (type === "LOOSE" ? "kg" : "pcs")}
            className={inputClass}
            placeholder={type === "LOOSE" ? "kg" : "pcs"}
          />
        </Field>
      </div>

      <Field label="Storefront category (website)">
        <select
          name="category"
          defaultValue={product?.category ?? ""}
          className={inputClass}
        >
          <option value="">— None (hidden from website) —</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Cost price">
          <input
            name="costPrice"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={product?.costPrice ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Regular price">
          <input
            name="regularPrice"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={product?.regularPrice ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Sale price">
          <input
            name="salePrice"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={product?.salePrice ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {includeStock && (
          <Field label={`Opening stock (${type === "LOOSE" ? "kg/qty" : "pcs"})`}>
            <input
              name="stock"
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              defaultValue={0}
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Barcode (optional)">
          <input
            name="barcode"
            defaultValue={product?.barcode ?? ""}
            className={inputClass}
            placeholder="e.g. 4790001000015"
          />
        </Field>
      </div>

      {type === "LOOSE" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Loose item: when you add new stock, the prices you enter there will
          replace these prices.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
