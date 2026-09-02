import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serve a POS inventory product's photo — used only by the POS product-edit
// preview (the public storefront uses /api/products/[id]/image → EcomProduct).
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: { imageData: true, imageType: true },
  });

  if (!product?.imageData) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = new Uint8Array(product.imageData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": product.imageType || "image/jpeg",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
