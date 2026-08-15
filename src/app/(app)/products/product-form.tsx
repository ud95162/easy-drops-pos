"use client";

import { useState, useTransition } from "react";
import type { SerializedProduct } from "@/lib/products";
import { createProduct, updateProduct } from "./actions";

type Props = {
  product?: SerializedProduct;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductForm({ product, onClose, onSaved }: Props) {
  const editing = Boolean(product);
  const [type, setType] = useState<"LOOSE" | "PACKET">(product?.type ?? "PACKET");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, formData)
        : await createProduct(formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {editing ? "Edit product" : "New product"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-3 gap-4">
            <Field label="Cost price">
              <input
                name="costPrice"
                type="number"
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
                step="0.01"
                min="0"
                defaultValue={product?.salePrice ?? 0}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!editing && (
              <Field label={`Opening stock (${type === "LOOSE" ? "kg/qty" : "pcs"})`}>
                <input
                  name="stock"
                  type="number"
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

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
