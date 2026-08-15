import { prisma } from "@/lib/prisma";
import { toNumber, formatLKR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true },
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTotalAgg = await prisma.sale.aggregate({
    _sum: { total: true },
    _count: true,
    where: { createdAt: { gte: startOfToday } },
  });

  const todayTotal = toNumber(todayTotalAgg._sum.total);
  const todayCount = todayTotalAgg._count;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sales history</h1>
          <p className="text-sm text-slate-500">Last 50 sales</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Today ({todayCount} sales)
          </div>
          <div className="text-xl font-bold text-brand-700">
            {formatLKR(todayTotal)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-semibold">
                  #{sale.id.slice(-8).toUpperCase()}
                </span>
                <span className="ml-2 text-sm text-slate-400">
                  {sale.createdAt.toLocaleString("en-LK")}
                </span>
              </div>
              <span className="text-lg font-bold text-brand-700">
                {formatLKR(toNumber(sale.total))}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {sale.items.map((item) => (
                <span key={item.id}>
                  {item.productSinhalaName}
                  <span className="text-slate-400">
                    {" "}
                    × {toNumber(item.quantity)}
                    {item.unit !== "pcs" ? item.unit : ""}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
        {sales.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-400">
            No sales yet. Head to the POS to make your first sale.
          </p>
        )}
      </div>
    </div>
  );
}
