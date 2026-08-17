/**
 * One-off: give every existing PACKET product (with stock but no batches) an
 * initial priced batch from its current stock and prices. Safe to re-run.
 */
import { PrismaClient, ProductType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const packets = await prisma.product.findMany({
    where: { type: ProductType.PACKET },
    include: { batches: true },
  });

  let created = 0;
  for (const p of packets) {
    if (p.batches.length > 0) continue; // already migrated
    if (Number(p.stock) <= 0) continue; // nothing to seed a batch with

    await prisma.productBatch.create({
      data: {
        productId: p.id,
        costPrice: p.costPrice,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        quantity: p.stock,
        remaining: p.stock,
      },
    });
    created++;
  }

  console.log(`Created initial batches for ${created} packet product(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
