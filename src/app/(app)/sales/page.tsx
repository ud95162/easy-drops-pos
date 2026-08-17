import { prisma } from "@/lib/prisma";
import { toNumber, round2, formatLKR } from "@/lib/money";
import type { Receipt } from "../pos/actions";
import { SalesClient, type SalesRow } from "./sales-client";

export const dynamic = "force-dynamic";

type SaleWithRelations = Awaited<
  ReturnType<typeof fetchSales>
>[number];

function fetchSales() {
  return prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true, customer: true },
  });
}

function saleToReceipt(sale: SaleWithRelations): Receipt {
  const items = sale.items.map((si) => ({
    name: si.productName,
    sinhalaName: si.productSinhalaName,
    unit: si.unit,
    quantity: toNumber(si.quantity),
    regularPrice: toNumber(si.regularPrice),
    unitPrice: toNumber(si.unitPrice),
    lineTotal: toNumber(si.lineTotal),
  }));
  const total = toNumber(sale.total);
  const regularTotal = round2(
    items.reduce((s, i) => s + i.regularPrice * i.quantity, 0)
  );
  return {
    id: sale.id,
    createdAt: sale.createdAt.toISOString(),
    total,
    regularTotal,
    savings: Math.max(0, round2(regularTotal - total)),
    paid: toNumber(sale.paid),
    change: toNumber(sale.change),
    credit: toNumber(sale.credit),
    customerName: sale.customer?.name ?? null,
    customerBalance: sale.customer ? toNumber(sale.customer.balance) : null,
    items,
  };
}

export default async function SalesPage() {
  const sales = await fetchSales();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayAgg = await prisma.sale.aggregate({
    _sum: { total: true },
    _count: true,
    where: { createdAt: { gte: startOfToday } },
  });

  const rows: SalesRow[] = sales.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    total: toNumber(s.total),
    credit: toNumber(s.credit),
    customerName: s.customer?.name ?? null,
    itemCount: s.items.length,
    receipt: saleToReceipt(s),
  }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sales history</h1>
          <p className="text-sm text-slate-500">Last {rows.length} invoices</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Today ({todayAgg._count} sales)
          </div>
          <div className="text-xl font-bold text-brand-700">
            {formatLKR(toNumber(todayAgg._sum.total))}
          </div>
        </div>
      </div>

      <SalesClient rows={rows} />
    </div>
  );
}
