import type { Customer } from "@prisma/client";
import { toNumber } from "./money";

export type SerializedCustomer = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  balance: number;
};

export function serializeCustomer(c: Customer): SerializedCustomer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    note: c.note,
    balance: toNumber(c.balance),
  };
}
