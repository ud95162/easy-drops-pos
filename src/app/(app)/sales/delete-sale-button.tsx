"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSale } from "./actions";

export function DeleteSaleButton({
  saleId,
  label,
}: {
  saleId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `Delete sale ${label}?\n\nThis cannot be undone. The sold items will be returned to stock.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteSale(saleId);
      if (!r.ok) alert(r.error ?? "Could not delete the sale.");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
