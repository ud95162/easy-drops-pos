import { prisma } from "@/lib/prisma";
import { serializeCustomer } from "@/lib/customers";
import { toNumber, formatLKR } from "@/lib/money";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: [{ balance: "desc" }, { name: "asc" }],
  });

  const outstanding = customers.reduce((sum, c) => sum + toNumber(c.balance), 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-slate-500">
            {customers.length} customers · credit book
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-amber-700">
            Total owed to shop
          </div>
          <div className="text-xl font-bold text-amber-800">
            {formatLKR(outstanding)}
          </div>
        </div>
      </div>

      <CustomersClient customers={customers.map(serializeCustomer)} />
    </div>
  );
}
