"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SerializedProduct } from "@/lib/products";
import { formatLKR } from "@/lib/money";
import { addStock } from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function StockClient({ products }: { products: SerializedProduct[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );
  const isLoose = selected?.type === "LOOSE";

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sinhalaName.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [products, search]);

  const showSuggestions = searchFocused && !productId && search.trim() !== "";

  function pickProduct(p: SerializedProduct) {
    setProductId(p.id);
    setSearch(`${p.name} — ${p.sinhalaName}`);
    setSearchFocused(false);
    setDone(false);
  }

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
        prices. For packets, the new stock becomes its own priced batch you can
        pick from when selling.
      </p>

      <form
        action={handleSubmit}
        className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <input type="hidden" name="productId" value={productId} />

        <div className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Product
          </span>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setProductId(""); // typing clears the selection until re-picked
                setSearchFocused(true);
                setDone(false);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions.length > 0) {
                  e.preventDefault();
                  pickProduct(suggestions[0]);
                }
              }}
              placeholder="Search product by name or Sinhala name…"
              className={inputClass}
            />
            {showSuggestions && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {suggestions.length === 0 ? (
                  <p className="px-4 py-4 text-center text-sm text-slate-400">
                    No products match “{search}”.
                  </p>
                ) : (
                  suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickProduct(p);
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-brand-50"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{p.name}</span>{" "}
                        <span className="text-slate-500">{p.sinhalaName}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {p.type === "LOOSE" ? "loose" : "packet"} · {p.stock}{" "}
                        {p.unit}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Current stock: <b>{selected.stock} {selected.unit}</b> · current sale
            price: <b>{formatLKR(selected.salePrice)}</b>
            {selected.type === "PACKET" && selected.batches.length > 0 && (
              <div className="mt-2 border-t border-slate-200 pt-2">
                <div className="mb-1 font-medium text-slate-500">
                  Batches (pick one when selling):
                </div>
                <ul className="space-y-0.5">
                  {selected.batches.map((b, i) => (
                    <li key={b.id} className="flex justify-between">
                      <span>
                        {i + 1}. {b.remaining} {selected.unit} @ {formatLKR(b.salePrice)}
                      </span>
                      <span className="text-slate-400">
                        cost {formatLKR(b.costPrice)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Quantity to add {selected ? `(${selected.unit})` : ""}
          </span>
          <input
            name="quantity"
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            className={inputClass}
            placeholder={isLoose ? "e.g. 25" : "e.g. 12"}
            required
          />
        </label>

        {selected && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-xs font-medium text-amber-800">
              {isLoose
                ? `New prices — these replace ${selected.name}'s current prices.`
                : `New batch prices — this stock becomes its own batch you can choose from when selling.`}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
