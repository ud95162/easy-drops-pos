"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SerializedProduct } from "@/lib/products";
import { formatLKR } from "@/lib/money";
import { addStock } from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function StockClient({ products }: { products: SerializedProduct[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );
  const isLoose = selected?.type === "LOOSE";

  function handleSubmit(formData: FormData) {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const r = await addStock(formData);
      if (!r.ok) {
        setError(r.error ?? "Could not add stock.");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Add stock</h1>
      <p className="mb-5 text-sm text-slate-500">
        Add incoming stock. For loose items, the new prices replace the current
        prices. Packet items keep their prices.
      </p>

      <form
        action={handleSubmit}
        className="max-w-xl rounded-xl border border-slate-200 bg-white p-6"
      >
        <input type="hidden" name="productId" value={productId} />

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Product
          </span>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setDone(false);
            }}
            className={inputClass}
            required
          >
            <option value="">Choose a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.sinhalaName} ({p.type === "LOOSE" ? "loose" : "packet"})
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Current stock: <b>{selected.stock} {selected.unit}</b> · current sale
            price: <b>{formatLKR(selected.salePrice)}</b>
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Quantity to add {selected ? `(${selected.unit})` : ""}
          </span>
          <input
            name="quantity"
            type="number"
            step="0.001"
            min="0"
            className={inputClass}
            placeholder={isLoose ? "e.g. 25" : "e.g. 12"}
            required
          />
        </label>

        {isLoose && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-xs font-medium text-amber-800">
              New batch prices — these will replace {selected?.name}&apos;s current
              prices.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Cost price
                </span>
                <input
                  name="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={selected?.costPrice}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Regular price
                </span>
                <input
                  name="regularPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={selected?.regularPrice}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Sale price
                </span>
                <input
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={selected?.salePrice}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Note (optional)
          </span>
          <input
            name="note"
            className={inputClass}
            placeholder="Supplier, invoice no., etc."
          />
        </label>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {done && (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Stock added successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !productId}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add stock"}
        </button>
      </form>
    </div>
  );
}
