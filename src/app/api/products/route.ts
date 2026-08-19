import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";

// Read-only public catalog for the storefront website.
// Returns active products in a website-friendly shape.

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const category = searchParams.get("category");
  const inStockOnly = searchParams.get("inStock") === "1";

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(inStockOnly ? { stock: { gt: 0 } } : {}),
    },
    orderBy: { name: "asc" },
  });

  const items = products.map((p) => {
    const originalPrice = toNumber(p.regularPrice);
    const salePrice = toNumber(p.salePrice);
    // Charge the sale price when set and below regular; otherwise the regular price.
    const discountedPrice =
      salePrice > 0 && salePrice < originalPrice ? salePrice : originalPrice;
    const discountPercentage =
      originalPrice > 0 && discountedPrice < originalPrice
        ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
        : 0;

    return {
      id: p.id,
      title: p.name,
      sinhalaName: p.sinhalaName,
      unit: p.unit,
      category: p.category,
      originalPrice,
      discountedPrice,
      discountPercentage,
      inStock: toNumber(p.stock) > 0,
      imageUrl: p.imageType ? `${url.origin}/api/products/${p.id}/image` : null,
    };
  });

  return NextResponse.json(
    { products: items, count: items.length },
    { headers: CORS_HEADERS }
  );
}
