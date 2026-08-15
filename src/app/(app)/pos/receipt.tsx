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

      {/* Items — one row each */}
      <table className="mt-2 w-full text-[11px]">
        <thead>
          <tr className="border-b border-dashed border-black text-left align-bottom">
            <th className="py-1 font-semibold">භාණ්ඩය / ප්‍රමාණය</th>
            <th className="py-1 text-right font-semibold">සා. මිල</th>
            <th className="py-1 text-right font-semibold">අපේ මිල</th>
            <th className="py-1 text-right font-semibold">එකතුව</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, i) => (
            <tr
              key={i}
              className="border-b border-dashed border-black/30 align-top"
            >
              <td className="py-1">
                {/* Sinhala name is what's printed for the customer */}
                <span className="font-semibold">{item.sinhalaName}</span>{" "}
                <span className="whitespace-nowrap text-black/70">
                  × {item.quantity}
                  {item.unit !== "pcs" ? item.unit : ""}
                </span>
              </td>
              <td className="py-1 text-right align-top">
                {item.regularPrice.toFixed(2)}
              </td>
              <td className="py-1 text-right align-top font-semibold">
                {item.unitPrice.toFixed(2)}
              </td>
              <td className="py-1 text-right align-top font-semibold">
                {item.lineTotal.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-2 border-t border-dashed border-black pt-2 text-[12px]">
        <Row label="මුළු එකතුව" value={formatLKR(receipt.total)} bold />
        {receipt.savings > 0 && (
          <Row label="ඔබ ලැබූ ලාභය" value={formatLKR(receipt.savings)} />
        )}
        <div className="my-1 border-t border-dashed border-black/40" />
        <Row label="ගෙවූ මුදල" value={formatLKR(receipt.paid)} />
        <Row label="ඉතිරි මුදල" value={formatLKR(receipt.change)} />
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
