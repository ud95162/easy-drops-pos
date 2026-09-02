"use client";

import { useState, useTransition } from "react";
import type { SerializedEcomProduct } from "@/lib/ecom-products";
import { StoreFields } from "./store-fields";
import { createEcomProduct, updateEcomProduct } from "./actions";

export function StoreForm({
  product,
  onDone,
  onCancel,
}: {
  product?: SerializedEcomProduct; // undefined = create
  onDone: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = !!product;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateEcomProduct(product!.id, formData)
        : await createEcomProduct(formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <form
        action={handleSubmit}
        className="my-8 w-full max-w-2xl space-y-4 rounded-xl bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editing ? "Edit online product" : "New online product"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <StoreFields product={product} />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}
