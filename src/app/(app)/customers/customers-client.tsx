"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedCustomer } from "@/lib/customers";
import { formatLKR } from "@/lib/money";
import {
  createCustomer,
  deleteCustomer,
  recordPayment,
} from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function CustomersClient({
  customers,
}: {
  customers: SerializedCustomer[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<SerializedCustomer | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  function handleDelete(c: SerializedCustomer) {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteCustomer(c.id);
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:max-w-xs"
        />
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New customer
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0">
              <Link
                href={`/customers/${c.id}`}
                className="font-semibold hover:text-brand-700 hover:underline"
              >
                {c.name}
              </Link>
              {c.phone && (
                <span className="ml-2 text-sm text-slate-400">{c.phone}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Balance
                </div>
                <div
                  className={`font-bold ${
                    c.balance > 0 ? "text-amber-700" : "text-slate-400"
                  }`}
                >
                  {c.balance > 0 ? formatLKR(c.balance) : "Settled"}
                </div>
              </div>
              <button
                onClick={() => setPaying(c)}
                disabled={c.balance <= 0}
                className="rounded-md border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
              >
                Record payment
              </button>
              <Link
                href={`/customers/${c.id}`}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                History
              </Link>
              <button
                onClick={() => handleDelete(c)}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-400">
            No customers yet. Add one to start a credit account.
          </p>
        )}
      </div>

      {adding && (
        <AddCustomerModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
      {paying && (
        <PaymentModal
          customer={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddCustomerModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await createCustomer(formData);
      if (!r.ok) {
        setError(r.error ?? "Could not add customer.");
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal title="New customer" onClose={onClose}>
      <form action={handleSubmit} className="space-y-3">
        <input name="name" required placeholder="Name" className={inputClass} />
        <input
          name="phone"
          inputMode="tel"
          placeholder="Phone (optional)"
          className={inputClass}
        />
        <input name="note" placeholder="Note (optional)" className={inputClass} />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add customer"}
        </button>
      </form>
    </Modal>
  );
}

function PaymentModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: SerializedCustomer;
  onClose: () => void;
  onSaved: () => void;
}) {
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
      const r = await recordPayment(customer.id, value, note);
      if (!r.ok) {
        setError(r.error ?? "Could not record payment.");
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal title={`Payment from ${customer.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Current balance:{" "}
        <span className="font-semibold text-amber-700">
          {formatLKR(customer.balance)}
        </span>
      </p>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Amount received
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={customer.balance.toFixed(2)}
            className={inputClass}
            autoFocus
          />
        </label>
        <button
          type="button"
          onClick={() => setAmount(String(customer.balance))}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          Pay full balance ({formatLKR(customer.balance)})
        </button>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className={inputClass}
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          onClick={submit}
          disabled={pending}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Record payment"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
