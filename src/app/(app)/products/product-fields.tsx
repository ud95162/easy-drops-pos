"use client";

import { useState } from "react";
import type { SerializedProduct } from "@/lib/products";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

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
