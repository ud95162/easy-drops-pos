"use client";

import { useRef, useState } from "react";
import type { SerializedEcomProduct } from "@/lib/ecom-products";
import { CATEGORIES } from "@/lib/categories";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/**
 * Resize + compress an image in the browser, returning a data URL.
 * Transparent formats (PNG/WebP/GIF) keep transparency by exporting PNG;
 * opaque photos are flattened onto white and exported as smaller JPEG.
 */
function compressImage(file: File, maxSize = 800, quality = 0.8): Promise<string> {
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
        const keepAlpha = /png|webp|gif/i.test(file.type);
        if (!keepAlpha) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(
          keepAlpha
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", quality)
        );
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
  // The public storefront image route is backed by EcomProduct.
  const existing =
    hasImage && productId ? `/api/products/${productId}/image` : null;
  const [preview, setPreview] = useState<string | null>(existing);
  const [dataUrl, setDataUrl] = useState("");
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
      // keep previous preview
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
        Product photo
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
      <input type="hidden" name="imageData" value={dataUrl} />
      <input type="hidden" name="imageRemove" value={remove ? "1" : ""} />
    </div>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="mt-0.5 h-5 w-5 accent-brand-600"
      />
      <input type="hidden" name={name} value={on ? "1" : ""} />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

/** Shared inputs for the create + edit forms. */
export function StoreFields({ product }: { product?: SerializedEcomProduct }) {
  const [type, setType] = useState<"LOOSE" | "PACKET">(product?.type ?? "PACKET");

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
        <Field label="Sinhala name">
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
            <option value="PACKET">Packet (sold as a unit)</option>
            <option value="LOOSE">Loose (sold by weight — decimal qty)</option>
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

      <Field label="Storefront category">
        <select
          name="category"
          defaultValue={product?.category ?? ""}
          className={inputClass}
        >
          <option value="">— None (hidden from category pages) —</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Field label="Sale price (0 = no discount)">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Toggle
          name="inStock"
          label="In stock"
          hint="Off shows it as out of stock online."
          defaultChecked={product?.inStock ?? true}
        />
        <Toggle
          name="active"
          label="Published"
          hint="Off hides it from the website & app."
          defaultChecked={product?.active ?? true}
        />
      </div>
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
