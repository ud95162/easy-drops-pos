"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { round2, toNumber } from "@/lib/money";

export type ActionResult = { ok: boolean; error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createCustomer(
  formData: FormData
): Promise<ActionResult & { id?: string }> {
  await requireAuth();

  const name = str(formData, "name");
  if (!name) return { ok: false, error: "Customer name is required." };

  const customer = await prisma.customer.create({
    data: {
      name,
      phone: str(formData, "phone") || null,
      note: str(formData, "note") || null,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/pos");
  return { ok: true, id: customer.id };
}

export async function updateCustomer(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  const name = str(formData, "name");
  if (!name) return { ok: false, error: "Customer name is required." };

  await prisma.customer.update({
    where: { id },
    data: {
      name,
      phone: str(formData, "phone") || null,
      note: str(formData, "note") || null,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/pos");
  return { ok: true };
}

/** Record a repayment from a customer, reducing their balance. */
export async function recordPayment(
  customerId: string,
  amount: number,
  note?: string
): Promise<ActionResult> {
  await requireAuth();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  const pay = round2(amount);

  await prisma.$transaction([
    prisma.customerPayment.create({
      data: { customerId, amount: pay, note: note?.trim() || null },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { balance: { decrement: pay } },
    }),
  ]);

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  await requireAuth();

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return { ok: false, error: "Customer not found." };
  if (toNumber(customer.balance) !== 0) {
    return {
      ok: false,
      error: "Cannot delete a customer who still has an outstanding balance.",
    };
  }

  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  revalidatePath("/pos");
  return { ok: true };
}
