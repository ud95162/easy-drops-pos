"use client";

import type { Receipt } from "./actions";
import { formatLKR } from "@/lib/money";

const SHOP_NAME = "Easy Drops";
const SHOP_TAGLINE = "Thank you for shopping with us!";

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const date = new Date(receipt.createdAt);
  return (
    <div id="receipt" className="mx-auto w-[80mm] bg-white p-4 text-[12px] text-black">
      <div className="text-center">
        <div className="text-base font-bold">{SHOP_NAME}</div>
        <div className="text-[11px]">Receipt</div>
      </div>

      <div className="mt-2 border-b border-dashed border-black pb-1 text-[11px]">
        <div>No: {receipt.id.slice(-8).toUpperCase()}</div>
        <div>{date.toLocaleString("en-LK")}</div>
      </div>

      <table className="mt-2 w-full">
        <thead>
          <tr className="border-b border-dashed border-black text-left">
            <th className="py-1">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Price</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="py-1">
                {/* Sinhala name is what's printed for the customer */}
                <div>{item.sinhalaName}</div>
                <div className="text-[10px] text-black/60">{item.name}</div>
              </td>
              <td className="py-1 text-right">
                {item.quantity}
                {item.unit !== "pcs" ? item.unit : ""}
              </td>
              <td className="py-1 text-right">{item.unitPrice.toFixed(2)}</td>
              <td className="py-1 text-right">{item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 border-t border-dashed border-black pt-2 text-[12px]">
        <Row label="Total" value={formatLKR(receipt.total)} bold />
        <Row label="Paid" value={formatLKR(receipt.paid)} />
        <Row label="Change" value={formatLKR(receipt.change)} />
      </div>

      <div className="mt-3 text-center text-[11px]">{SHOP_TAGLINE}</div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
