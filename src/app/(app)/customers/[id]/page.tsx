import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber, formatLKR } from "@/lib/money";
import { RecordPayment } from "./record-payment";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: { orderBy: { createdAt: "desc" }, include: { items: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) notFound();

  const balance = toNumber(customer.balance);

  return (
    <div>
      <Link
        href="/customers"
        className="text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        ← Back to customers
      </Link>

      <div className="mb-5 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-sm text-slate-500">
            {customer.phone ?? "No phone"}
            {customer.note ? ` · ${customer.note}` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-amber-700">
            Balance owed
          </div>
          <div className="text-xl font-bold text-amber-800">
            {formatLKR(balance)}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <RecordPayment customerId={customer.id} balance={balance} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Credit sales */}
        <section>
          <h2 className="mb-2 text-lg font-bold">Sales on credit</h2>
          <div className="space-y-2">
            {customer.sales.filter((s) => toNumber(s.credit) > 0).length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
                No credit sales.
              </p>
            )}
            {customer.sales
              .filter((s) => toNumber(s.credit) > 0)
              .map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      #{sale.id.slice(-8).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {sale.createdAt.toLocaleString("en-LK")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
                    <span>Total: {formatLKR(toNumber(sale.total))}</span>
                    <span>Paid: {formatLKR(toNumber(sale.paid))}</span>
                    <span className="font-semibold text-amber-700">
                      Credit: {formatLKR(toNumber(sale.credit))}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Payments */}
        <section>
          <h2 className="mb-2 text-lg font-bold">Payments received</h2>
          <div className="space-y-2">
            {customer.payments.length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
                No payments yet.
              </p>
            )}
            {customer.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <div>
                  <div className="text-xs text-slate-400">
                    {p.createdAt.toLocaleString("en-LK")}
                  </div>
                  {p.note && <div className="text-xs text-slate-500">{p.note}</div>}
                </div>
                <span className="font-semibold text-green-700">
                  + {formatLKR(toNumber(p.amount))}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
