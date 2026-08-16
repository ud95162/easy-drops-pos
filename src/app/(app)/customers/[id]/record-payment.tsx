"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "../actions";
import { formatLKR } from "@/lib/money";

export function RecordPayment({
  customerId,
  balance,
}: {
  customerId: string;
  balance: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    startTransition(async () => {
      const r = await recordPayment(customerId, value, note);
      if (!r.ok) {
        setError(r.error ?? "Could not record payment.");
        return;
      }
      setAmount("");
      setNote("");
      router.refresh();
    });
  }

  if (balance <= 0) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        This customer has no outstanding balance.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
      <h2 className="mb-2 text-sm font-bold text-brand-800">Record a payment</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Amount
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={balance.toFixed(2)}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500"
          />
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Record"}
        </button>
        <button
          type="button"
          onClick={() => setAmount(String(balance))}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          Full ({formatLKR(balance)})
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
