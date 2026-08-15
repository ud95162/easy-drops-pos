"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProduct } from "../actions";
import { ProductFields } from "../product-fields";

export function NewProductForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProduct(formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      // Product created — go back to the products list.
      router.push("/products");
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <ProductFields includeStock />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Link
          href="/products"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create product"}
        </button>
      </div>
    </form>
  );
}
