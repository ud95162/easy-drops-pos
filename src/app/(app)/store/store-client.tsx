"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SerializedEcomProduct } from "@/lib/ecom-products";
import { formatLKR } from "@/lib/money";
import { categoryName } from "@/lib/categories";
import { StoreForm } from "./store-form";
import {
  deleteEcomProduct,
  importFromPos,
  setEcomActive,
  setEcomInStock,
} from "./actions";

type Modal = { kind: "new" } | { kind: "edit"; product: SerializedEcomProduct };

export function StoreClient({
  products,
}: {
  products: SerializedEcomProduct[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sinhalaName.toLowerCase().includes(q)
    );
  }, [products, query]);

  function refresh() {
    setModal(null);
    router.refresh();
  }

  function handleImport() {
    if (
      !confirm(
        "Copy your current POS products into the online catalog?\n\nProducts already here (matched by name) are skipped, so this is safe to run again."
      )
    )
      return;
    startTransition(async () => {
      const r = await importFromPos();
      if (!r.ok) alert(r.error ?? "Import failed.");
      else alert(`Imported ${r.added ?? 0} product(s).`);
      router.refresh();
    });
  }

  function handleDelete(p: SerializedEcomProduct) {
    if (!confirm(`Delete "${p.name}" from the online store?`)) return;
    startTransition(async () => {
      const r = await deleteEcomProduct(p.id);
      if (r.error) alert(r.error);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Online Store</h1>
          <p className="text-sm text-slate-500">
            {products.length} product(s) shown on the website &amp; app · managed
            separately from POS stock
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Import from POS
          </button>
          <button
            onClick={() => setModal({ kind: "new" })}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + New product
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or Sinhala name…"
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:max-w-md"
      />

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">
            No online products yet. Add one, or{" "}
            <button
              onClick={handleImport}
              className="font-semibold text-brand-700 hover:underline"
            >
              import your POS products
            </button>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Regular</th>
                <th className="px-4 py-3 text-right">Sale</th>
                <th className="px-4 py-3 text-center">In stock</th>
                <th className="px-4 py-3 text-center">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className={p.active ? "" : "bg-slate-50 opacity-70"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                        {p.hasImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/products/${p.id}/image`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-slate-300">🖼️</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-slate-500">
                          {p.sinhalaName}
                          {p.type === "LOOSE" ? ` · loose (${p.unit})` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {categoryName(p.category) || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatLKR(p.regularPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-700">
                    {p.salePrice > 0 && p.salePrice < p.regularPrice
                      ? formatLKR(p.salePrice)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      on={p.inStock}
                      onToggle={() =>
                        startTransition(async () => {
                          await setEcomInStock(p.id, !p.inStock);
                          router.refresh();
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      on={p.active}
                      onToggle={() =>
                        startTransition(async () => {
                          await setEcomActive(p.id, !p.active);
                          router.refresh();
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setModal({ kind: "edit", product: p })}
                        className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        Edit
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
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <StoreForm
          product={modal.kind === "edit" ? modal.product : undefined}
          onDone={refresh}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex h-6 w-11 items-center rounded-full transition ${
        on ? "bg-brand-600" : "bg-slate-300"
      }`}
      aria-pressed={on}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          on ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
