import { Prisma } from "@prisma/client";

/** Format a number as Sri Lankan Rupees, e.g. Rs. 1,250.00 */
export function formatLKR(value: number): string {
  return (
    "Rs. " +
    value.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Format a quantity, dropping trailing zeros (e.g. 1.5 kg, 3 pcs) */
export function formatQty(value: number, unit?: string): string {
  const q = Number.isInteger(value) ? value.toString() : value.toString();
  return unit ? `${q} ${unit}` : q;
}

/** Turn a Prisma.Decimal (or number/string) into a plain number for the client. */
export function toNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

/** Round to 2 decimal places to avoid floating point noise on money. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
