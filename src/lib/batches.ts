import { round2 } from "./money";

export type BatchLite = {
  id: string;
  salePrice: number;
  regularPrice: number;
  remaining: number;
};

export type FifoSegment = {
  batchId: string;
  quantity: number;
  salePrice: number;
  regularPrice: number;
};

function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

/**
 * Consume `qty` from oldest-first batches (FIFO). Returns the priced segments
 * and any shortfall (quantity that couldn't be filled from the batches).
 */
export function fifoConsume(
  batches: BatchLite[],
  qty: number
): { segments: FifoSegment[]; shortfall: number } {
  let remaining = round3(qty);
  const segments: FifoSegment[] = [];

  for (const b of batches) {
    if (remaining <= 0) break;
    const take = round3(Math.min(remaining, b.remaining));
    if (take > 0) {
      segments.push({
        batchId: b.id,
        quantity: take,
        salePrice: b.salePrice,
        regularPrice: b.regularPrice,
      });
      remaining = round3(remaining - take);
    }
  }

  return { segments, shortfall: Math.max(0, remaining) };
}

/** FIFO price for a quantity: total at sale price and at regular price. */
export function fifoTotals(
  batches: BatchLite[],
  qty: number
): { total: number; regularTotal: number; shortfall: number } {
  const { segments, shortfall } = fifoConsume(batches, qty);
  let total = 0;
  let regularTotal = 0;
  for (const s of segments) {
    total = round2(total + s.salePrice * s.quantity);
    regularTotal = round2(regularTotal + s.regularPrice * s.quantity);
  }
  return { total, regularTotal, shortfall };
}
