"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SerializedProduct } from "@/lib/products";
import type { SerializedCustomer } from "@/lib/customers";
import { formatLKR, round2 } from "@/lib/money";
import { createSale, type Receipt } from "./actions";
import { createCustomer } from "../customers/actions";
import { ReceiptView } from "./receipt";

type CartItem = {
  product: SerializedProduct;
  quantity: number;
};

export function PosClient({
  products,
  customers,
}: {
  products: SerializedProduct[];
  customers: SerializedCustomer[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paid, setPaid] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [pending, startTransition] = useTransition();

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

  const total = useMemo(
    () =>
      round2(
        cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0)
      ),
    [cart]
  );

  // Blank cash = paid in full (no change). Type a number for partial/credit.
  const paidNum = paid.trim() === "" ? total : Number(paid) || 0;
  const change = round2(Math.max(0, paidNum - total));
  const credit = round2(Math.max(0, total - paidNum));

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId]
  );

  function addToCart(product: SerializedProduct) {
    setError(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: round2(i.quantity + (product.type === "LOOSE" ? 0.5 : 1)) }
            : i
        );
      }
      return [...prev, { product, quantity: product.type === "LOOSE" ? 1 : 1 }];
    });
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      )
    );
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.max(0, round2(i.quantity + delta)) }
          : i
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
    setPaid("");
    setCustomerId("");
    setError(null);
  }

  function handleAddCustomer(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await createCustomer(formData);
      if (!r.ok || !r.id) {
        setError(r.error ?? "Could not add the customer.");
        return;
      }
      setCustomerId(r.id);
      setAddingCustomer(false);
      router.refresh();
    });
  }

  function checkout() {
    setError(null);
    const lines = cart
      .filter((i) => i.quantity > 0)
      .map((i) => ({ productId: i.product.id, quantity: i.quantity }));
    if (lines.length === 0) {
      setError("Add at least one item.");
      return;
    }
    if (credit > 0 && !customerId) {
      setError(
        "This is a credit (unpaid) sale — select a customer, or enter the full cash amount."
      );
      return;
    }
    startTransition(async () => {
      const result = await createSale(lines, paidNum, customerId || null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReceipt(result.receipt);
      setCart([]);
      setPaid("");
      setCustomerId("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px] md:gap-6 lg:grid-cols-[1fr_380px]">
      {/* Product picker */}
      <div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputMode="search"
          autoFocus
          placeholder="Search or scan barcode…"
          className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {filtered.map((p) => {
            const out = p.stock <= 0;
            return (
              <button
                key={p.id}
                onClick={() => !out && addToCart(p)}
                disabled={out}
                className={`min-h-[92px] rounded-xl border bg-white p-3 text-left transition active:scale-[0.98] ${
                  out
                    ? "cursor-not-allowed border-slate-200 opacity-50"
                    : "border-slate-200 hover:border-brand-400 hover:shadow-sm"
                }`}
              >
                <div className="font-semibold leading-tight">{p.name}</div>
                <div className="text-sm text-slate-500">{p.sinhalaName}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-bold text-brand-700">
                    {formatLKR(p.salePrice)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {p.stock} {p.unit}
                  </span>
                </div>
                {p.type === "LOOSE" && (
                  <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    loose / {p.unit}
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-slate-400">
              No products found.
            </p>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="md:sticky md:top-20 md:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Cart</h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-medium text-slate-400 hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Tap products to add them.
            </p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => {
                const step = item.product.type === "LOOSE" ? 0.5 : 1;
                return (
                  <div
                    key={item.product.id}
                    className="rounded-lg border border-slate-100 p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatLKR(item.product.salePrice)} / {item.product.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-lg text-slate-300 hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => changeQty(item.product.id, -step)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-xl font-medium text-slate-600 hover:bg-slate-50 active:scale-95"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          step={item.product.type === "LOOSE" ? "0.001" : "1"}
                          value={item.quantity}
                          onChange={(e) =>
                            setQty(item.product.id, Number(e.target.value))
                          }
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-base outline-none focus:border-brand-500"
                        />
                        <button
                          onClick={() => changeQty(item.product.id, step)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-xl font-medium text-slate-600 hover:bg-slate-50 active:scale-95"
                          aria-label="Increase"
                        >
                          +
                        </button>
                        <span className="ml-1 text-xs text-slate-400">
                          {item.product.unit}
                        </span>
                      </div>
                      <div className="text-right text-sm font-semibold">
                        {formatLKR(round2(item.product.salePrice * item.quantity))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-brand-700">{formatLKR(total)}</span>
            </div>

            {/* Customer (optional; required for credit sales) */}
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Customer
                </span>
                <button
                  type="button"
                  onClick={() => setAddingCustomer((v) => !v)}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  {addingCustomer ? "Cancel" : "+ New customer"}
                </button>
              </div>
              {addingCustomer ? (
                <form
                  action={handleAddCustomer}
                  className="space-y-2 rounded-lg border border-brand-200 bg-brand-50 p-2"
                >
                  <input
                    name="name"
                    required
                    placeholder="Customer name"
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-base outline-none focus:border-brand-500"
                  />
                  <input
                    name="phone"
                    inputMode="tel"
                    placeholder="Phone (optional)"
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-base outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    Save customer
                  </button>
                </form>
              ) : (
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Walk-in (no customer)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                      {c.balance > 0 ? ` — owes ${formatLKR(c.balance)}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="mb-2 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Cash received
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder={total.toFixed(2)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-right text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            {change > 0 && (
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-slate-500">Change</span>
                <span className="font-semibold">{formatLKR(change)}</span>
              </div>
            )}
            {credit > 0 && (
              <div className="mb-3 flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <span className="font-medium text-amber-800">
                  Credit (owed){selectedCustomer ? ` · ${selectedCustomer.name}` : ""}
                </span>
                <span className="font-bold text-amber-800">
                  {formatLKR(credit)}
                </span>
              </div>
            )}

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={checkout}
              disabled={pending || cart.length === 0}
              className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Processing…" : "Complete sale"}
            </button>
          </div>
        </div>
      </div>

      {receipt && (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}

function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: Receipt;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-auto rounded-2xl bg-white shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-bold text-green-700">Sale complete ✓</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <ReceiptView receipt={receipt} />

        <div className="no-print flex gap-2 border-t border-slate-100 p-4">
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            Print receipt
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            New sale
          </button>
        </div>
      </div>
    </div>
  );
}
