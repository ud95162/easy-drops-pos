"use client";

import { useState, useTransition } from "react";
import type { SerializedProduct } from "@/lib/products";
import { updateProduct } from "./actions";
import { ProductFields } from "./product-fields";

type Props = {
  product: SerializedProduct;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductForm({ product, onClose, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateProduct(product.id, formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Edit product</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <ProductFields product={product} includeStock={false} />

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
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
