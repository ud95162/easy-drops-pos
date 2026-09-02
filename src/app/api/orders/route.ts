import type { Order, OrderItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/app-auth";
import { toNumber, round2 } from "@/lib/money";
import { corsOptions, json, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsOptions();
}

function serialize(order: Order & { items: OrderItem[] }) {
  return {
    id: order.id,
    status: order.status,
    total: toNumber(order.total),
    name: order.name,
    phone: order.phone,
    address: order.address,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      productName: it.productName,
      unit: it.unit,
      unitPrice: toNumber(it.unitPrice),
      quantity: toNumber(it.quantity),
      lineTotal: toNumber(it.lineTotal),
    })),
  };
}

// GET /api/orders — the signed-in shopper's orders (newest first).
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return jsonError("Not authenticated.", 401);

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return json({ orders: orders.map(serialize) });
}

// POST /api/orders — place a new PENDING order.
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return jsonError("Not authenticated.", 401);

  let body: {
    items?: { productId?: string; quantity?: number }[];
    name?: string;
    phone?: string;
    address?: string;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) return jsonError("Your cart is empty.");

  const name = (body.name || user.name || "").trim();
  const phone = (body.phone || user.phone || "").trim();
  const address = (body.address || user.address || "").trim();
  if (!name || !phone || !address)
    return jsonError("Name, phone, and delivery address are required.");

  // Recompute prices from the database — never trust client-sent prices.
  // The storefront catalog is EcomProduct (not POS inventory).
  const ids = rawItems.map((i) => i.productId).filter(Boolean) as string[];
  const products = await prisma.ecomProduct.findMany({
    where: { id: { in: ids }, active: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const itemsData: {
    productName: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[] = [];

  for (const raw of rawItems) {
    const p = raw.productId ? byId.get(raw.productId) : undefined;
    if (!p) return jsonError("One or more products are unavailable.");
    const qty = Number(raw.quantity);
    if (!Number.isFinite(qty) || qty <= 0)
      return jsonError("Invalid quantity for a product.");
    const regular = toNumber(p.regularPrice);
    const sale = toNumber(p.salePrice);
    const unitPrice = sale > 0 && sale < regular ? sale : regular;
    itemsData.push({
      // No productId link: OrderItem.productId references POS Product, and the
      // catalog is EcomProduct. The snapshot fields below keep the line correct.
      productName: p.name,
      unit: p.unit,
      unitPrice,
      quantity: qty,
      lineTotal: round2(unitPrice * qty),
    });
  }

  const total = round2(itemsData.reduce((s, it) => s + it.lineTotal, 0));

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: "PENDING",
      total,
      name,
      phone,
      address,
      note: (body.note || "").trim() || null,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  return json({ order: serialize(order) }, 201);
}
