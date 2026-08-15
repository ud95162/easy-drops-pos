"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedProduct } from "@/lib/products";
import { formatLKR } from "@/lib/money";
import { ProductForm } from "./product-form";
import { deleteProduct, setProductActive } from "./actions";

export function ProductsClient({ products }: { products: SerializedProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SerializedProduct | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sinhalaName.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  function handleDelete(p: SerializedProduct) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const r = await deleteProduct(p.id);
      if (r.error) alert(r.error);
      router.refresh();
    });
  }

  function handleToggle(p: SerializedProduct) {
    startTransition(async () => {
      await setProductActive(p.id, !p.active);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-slate-500">
            {products.length} products · manage names, prices and types
          </p>
        </div>
        <Link
          href="/products/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New product
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, Sinhala name or barcode…"
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:max-w-md"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Sinhala</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Regular</th>
              <th className="px-4 py-3 text-right">Sale</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className={p.active ? "" : "bg-slate-50 opacity-60"}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.sinhalaName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.type === "LOOSE"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {p.type === "LOOSE" ? `Loose (${p.unit})` : "Packet"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {formatLKR(p.costPrice)}
                </td>
                <td className="px-4 py-3 text-right">{formatLKR(p.regularPrice)}</td>
                <td className="px-4 py-3 text-right font-semibold text-brand-700">
                  {formatLKR(p.salePrice)}
                </td>
                <td className="px-4 py-3 text-right">
                  {p.stock} {p.unit}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditing(p)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(p)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      {p.active ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
