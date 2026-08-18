import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber, round2, formatLKR } from "@/lib/money";

export const dynamic = "force-dynamic";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);

  const fromStr = sp.from || ymd(defaultFrom);
  const toStr = sp.to || ymd(today);

  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T23:59:59.999`);

  const [sales, products] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      include: { items: true, customer: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { batches: { where: { remaining: { gt: 0 } } } },
    }),
  ]);

  // ---- Sales / profit ----
  type Bill = {
    id: string;
    createdAt: Date;
    customerName: string | null;
    revenue: number;
    cost: number;
    profit: number;
  };
  const bills: Bill[] = sales.map((s) => {
    const revenue = toNumber(s.total);
    const cost = round2(
      s.items.reduce(
        (sum, i) => sum + toNumber(i.costPrice) * toNumber(i.quantity),
        0
      )
    );
    return {
      id: s.id,
      createdAt: s.createdAt,
      customerName: s.customer?.name ?? null,
      revenue,
      cost,
      profit: round2(revenue - cost),
    };
  });

  const totalRevenue = round2(bills.reduce((s, b) => s + b.revenue, 0));
  const totalCost = round2(bills.reduce((s, b) => s + b.cost, 0));
  const totalProfit = round2(totalRevenue - totalCost);

  // Per-day breakdown
  const byDay = new Map<
    string,
    { revenue: number; cost: number; profit: number; count: number }
  >();
  for (const b of bills) {
    const key = ymd(b.createdAt);
    const d = byDay.get(key) ?? { revenue: 0, cost: 0, profit: 0, count: 0 };
    d.revenue = round2(d.revenue + b.revenue);
    d.cost = round2(d.cost + b.cost);
    d.profit = round2(d.profit + b.profit);
    d.count += 1;
    byDay.set(key, d);
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  // ---- Inventory ----
  const inventory = products.map((p) => {
    const hasBatches = p.type === "PACKET" && p.batches.length > 0;
    let stock: number;
    let costValue: number;
    let retailValue: number;
    if (hasBatches) {
      stock = p.batches.reduce((s, b) => s + toNumber(b.remaining), 0);
      costValue = round2(
        p.batches.reduce(
          (s, b) => s + toNumber(b.remaining) * toNumber(b.costPrice),
          0
        )
      );
      retailValue = round2(
        p.batches.reduce(
          (s, b) => s + toNumber(b.remaining) * toNumber(b.salePrice),
          0
        )
      );
    } else {
      stock = toNumber(p.stock);
      costValue = round2(stock * toNumber(p.costPrice));
      retailValue = round2(stock * toNumber(p.salePrice));
    }
    return {
      id: p.id,
      name: p.name,
      sinhalaName: p.sinhalaName,
      unit: p.unit,
      stock,
      costValue,
      retailValue,
      potentialProfit: round2(retailValue - costValue),
    };
  });
  const invCost = round2(inventory.reduce((s, i) => s + i.costValue, 0));
  const invRetail = round2(inventory.reduce((s, i) => s + i.retailValue, 0));

  const presets = [
    { label: "Today", from: ymd(today), to: ymd(today) },
    {
      label: "Last 7 days",
      from: ymd(new Date(today.getTime() - 6 * 864e5)),
      to: ymd(today),
    },
    { label: "This month", from: ymd(defaultFrom), to: ymd(today) },
    { label: "This year", from: `${today.getFullYear()}-01-01`, to: ymd(today) },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Reports</h1>
      <p className="mb-5 text-sm text-slate-500">
        Sales profit and inventory valuation.
      </p>

      {/* Date filter */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <form
          method="get"
          className="flex flex-wrap items-end gap-3"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              From
            </span>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              To
            </span>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Apply
          </button>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <Link
                key={p.label}
                href={`/reports?from=${p.from}&to=${p.to}`}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </form>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Sales (revenue)" value={formatLKR(totalRevenue)} />
        <SummaryCard label="Cost of goods" value={formatLKR(totalCost)} muted />
        <SummaryCard
          label="Profit"
          value={formatLKR(totalProfit)}
          highlight
        />
        <SummaryCard label="Bills" value={String(bills.length)} />
      </div>

      {/* Per-day */}
      <h2 className="mb-2 text-lg font-bold">Profit by day</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Bills</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {days.map(([date, d]) => (
              <tr key={date}>
                <td className="px-4 py-3 font-medium">{date}</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {d.count}
                </td>
                <td className="px-4 py-3 text-right">{formatLKR(d.revenue)}</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {formatLKR(d.cost)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">
                  {formatLKR(d.profit)}
                </td>
              </tr>
            ))}
            {days.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No sales in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Per-bill */}
      <h2 className="mb-2 text-lg font-bold">Profit per bill</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium">
                  #{b.id.slice(-8).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {b.createdAt.toLocaleString("en-LK")}
                </td>
                <td className="px-4 py-3">
                  {b.customerName ?? (
                    <span className="text-slate-400">Walk-in</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{formatLKR(b.revenue)}</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {formatLKR(b.cost)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">
                  {formatLKR(b.profit)}
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No sales in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Inventory */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Inventory on hand</h2>
        <div className="text-sm text-slate-500">
          Stock value at cost:{" "}
          <b className="text-slate-800">{formatLKR(invCost)}</b> · at retail:{" "}
          <b className="text-slate-800">{formatLKR(invRetail)}</b> · potential
          profit:{" "}
          <b className="text-green-700">{formatLKR(round2(invRetail - invCost))}</b>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">In stock</th>
              <th className="px-4 py-3 text-right">Cost value</th>
              <th className="px-4 py-3 text-right">Retail value</th>
              <th className="px-4 py-3 text-right">Potential profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{i.name}</span>{" "}
                  <span className="text-slate-400">{i.sinhalaName}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {i.stock} {i.unit}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {formatLKR(i.costValue)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatLKR(i.retailValue)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">
                  {formatLKR(i.potentialProfit)}
                </td>
              </tr>
            ))}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No products.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-bold ${
          highlight
            ? "text-green-700"
            : muted
              ? "text-slate-500"
              : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
