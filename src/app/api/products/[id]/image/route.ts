import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serve a product's photo (bytes stored in the DB). Public, read-only.
export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    // Explicitly select the bytes (overrides the global omit).
    select: { imageData: true, imageType: true },
  });

  if (!product?.imageData) {
    return new NextResponse("Not found", { status: 404, headers: CORS });
  }

  const body = new Uint8Array(product.imageData);
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": product.imageType || "image/jpeg",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
