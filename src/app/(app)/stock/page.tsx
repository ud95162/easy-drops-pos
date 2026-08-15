import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/products";
import { toNumber, formatLKR } from "@/lib/money";
import { StockClient } from "./stock-client";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [products, entries] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { product: true },
    }),
  ]);

  return (
    <div>
      <StockClient products={products.map(serializeProduct)} />

      <h2 className="mb-3 mt-10 text-lg font-bold">Recent stock added</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Qty added</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">New sale price</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-slate-500">
                  {e.createdAt.toLocaleString("en-LK")}
                </td>
                <td className="px-4 py-3 font-medium">
                  {e.product ? e.product.name : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {toNumber(e.quantity)} {e.product?.unit}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {formatLKR(toNumber(e.costPrice))}
                </td>
                <td className="px-4 py-3 text-right">
                  {e.salePrice != null ? formatLKR(toNumber(e.salePrice)) : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{e.note ?? ""}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No stock added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
