"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatLKR } from "@/lib/money";
import type { Receipt } from "../pos/actions";
import { ReceiptView } from "../pos/receipt";
import { deleteSale } from "./actions";

export type SalesRow = {
  id: string;
  createdAt: string;
  total: number;
  credit: number;
  customerName: string | null;
  itemCount: number;
  receipt: Receipt;
};

export function SalesClient({ rows }: { rows: SalesRow[] }) {
  const router = useRouter();
  const [viewing, setViewing] = useState<SalesRow | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(row: SalesRow) {
    if (
      !confirm(
        `Delete invoice #${row.id.slice(-8).toUpperCase()}?\n\nThis cannot be undone. Sold items return to stock and any credit is reversed.`
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteSale(row.id);
      if (!r.ok) alert(r.error ?? "Could not delete the sale.");
      if (viewing?.id === row.id) setViewing(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">
                  #{row.id.slice(-8).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(row.createdAt).toLocaleString("en-LK")}
                </td>
                <td className="px-4 py-3">
                  {row.customerName ? (
                    <span>
                      {row.customerName}
                      {row.credit > 0 && (
                        <span className="ml-1 text-xs text-amber-700">
                          (credit {formatLKR(row.credit)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">Walk-in</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {row.itemCount}
                </td>
                <td className="px-4 py-3 text-right font-bold text-brand-700">
                  {formatLKR(row.total)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setViewing(row)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      disabled={pending}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  No sales yet. Head to the POS to make your first sale.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <InvoiceModal row={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function InvoiceModal({
  row,
  onClose,
}: {
  row: SalesRow;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const fileBase = `receipt-${row.id.slice(-8).toUpperCase()}`;

  async function renderCanvas() {
    const el = document.getElementById("receipt");
    if (!el) throw new Error("Receipt not found");
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
  }

  async function sharePng() {
    setBusy("png");
    try {
      const canvas = await renderCanvas();
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/png")
      );
      if (!blob) throw new Error("Could not create image");
      const file = new File([blob], `${fileBase}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileBase });
      } else {
        downloadBlob(blob, `${fileBase}.png`);
      }
    } catch (e) {
      alert("Could not share the receipt image.");
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  async function savePdf() {
    setBusy("pdf");
    try {
      const canvas = await renderCanvas();
      const { jsPDF } = await import("jspdf");
      const widthMm = 72;
      const heightMm = (canvas.height * widthMm) / canvas.width;
      const pdf = new jsPDF({
        unit: "mm",
        format: [widthMm, heightMm],
        orientation: "portrait",
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        widthMm,
        heightMm
      );
      pdf.save(`${fileBase}.pdf`);
    } catch (e) {
      alert("Could not create the PDF.");
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-sm overflow-auto rounded-2xl bg-white shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-bold">
            Invoice #{row.id.slice(-8).toUpperCase()}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <ReceiptView receipt={row.receipt} />

        <div className="no-print grid grid-cols-3 gap-2 border-t border-slate-100 p-4">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Print
          </button>
          <button
            onClick={sharePng}
            disabled={busy !== null}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy === "png" ? "…" : "Share PNG"}
          </button>
          <button
            onClick={savePdf}
            disabled={busy !== null}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy === "pdf" ? "…" : "Save PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
