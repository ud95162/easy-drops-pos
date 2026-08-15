"use client";

import type { Receipt } from "./actions";
import { formatLKR } from "@/lib/money";

const SHOP_NAME = "Easy Drops";
const SHOP_TAGLINE = "Thank you for shopping with us!";

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const date = new Date(receipt.createdAt);
  return (
    <div
      id="receipt"
      className="mx-auto w-[80mm] bg-white p-4 text-[12px] text-black"
    >
      <div className="text-center">
        <div className="text-base font-bold">{SHOP_NAME}</div>
        <div className="text-[11px]">Receipt</div>
      </div>

      <div className="mt-2 border-b border-dashed border-black pb-1 text-[11px]">
        <div>No: {receipt.id.slice(-8).toUpperCase()}</div>
        <div>{date.toLocaleString("en-LK")}</div>
      </div>

      {/* Items */}
      <div className="mt-2 divide-y divide-dashed divide-black/40">
        {receipt.items.map((item, i) => (
          <div key={i} className="py-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {/* Sinhala name is what's printed for the customer */}
                <div className="font-semibold leading-tight">
                  {item.sinhalaName}
                </div>
                <div className="text-[10px] text-black/60">{item.name}</div>
              </div>
              <div className="whitespace-nowrap text-right font-semibold">
                {item.lineTotal.toFixed(2)}
              </div>
            </div>

            <div className="mt-0.5 flex items-center justify-between text-[11px]">
              <span>
                Regular:{" "}
                <span className="line-through">
                  {item.regularPrice.toFixed(2)}
                </span>
              </span>
              <span className="font-semibold">
                අපේ මිල: {item.unitPrice.toFixed(2)}
              </span>
            </div>

            <div className="text-[10px] text-black/60">
              {item.quantity}
              {item.unit !== "pcs" ? " " + item.unit : ""} × {item.unitPrice.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-2 border-t border-dashed border-black pt-2 text-[12px]">
        <Row
          label="Regular total"
          value={
            <span className="line-through">
              {formatLKR(receipt.regularTotal)}
            </span>
          }
        />
        <Row
          label="Total (අපේ මිල)"
          value={formatLKR(receipt.total)}
          bold
        />
        {receipt.savings > 0 && (
          <Row label="You saved" value={formatLKR(receipt.savings)} />
        )}
        <div className="my-1 border-t border-dashed border-black/40" />
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
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
