import { PrismaClient, ProductType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      name: "Sugar",
      sinhalaName: "සීනි",
      type: ProductType.LOOSE,
      unit: "kg",
      costPrice: 220,
      regularPrice: 260,
      salePrice: 250,
      stock: 50,
      barcode: null,
    },
    {
      name: "Red Rice",
      sinhalaName: "රතු කැකුළු",
      type: ProductType.LOOSE,
      unit: "kg",
      costPrice: 190,
      regularPrice: 230,
      salePrice: 220,
      stock: 80,
      barcode: null,
    },
    {
      name: "Dhal",
      sinhalaName: "පරිප්පු",
      type: ProductType.LOOSE,
      unit: "kg",
      costPrice: 330,
      regularPrice: 390,
      salePrice: 375,
      stock: 40,
      barcode: null,
    },
    {
      name: "Milk Powder 400g",
      sinhalaName: "කිරිපිටි 400g",
      type: ProductType.PACKET,
      unit: "pcs",
      costPrice: 820,
      regularPrice: 950,
      salePrice: 930,
      stock: 30,
      barcode: "4790001000015",
    },
    {
      name: "Tea Packet 200g",
      sinhalaName: "තේ 200g",
      type: ProductType.PACKET,
      unit: "pcs",
      costPrice: 340,
      regularPrice: 420,
      salePrice: 400,
      stock: 45,
      barcode: "4790001000022",
    },
    {
      name: "Biscuit Pack",
      sinhalaName: "බිස්කට්",
      type: ProductType.PACKET,
      unit: "pcs",
      costPrice: 110,
      regularPrice: 150,
      salePrice: 140,
      stock: 60,
      barcode: "4790001000039",
    },
  ];

  // Idempotent reseed of the demo catalogue.
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.stockEntry.deleteMany();
  await prisma.productBatch.deleteMany();
  await prisma.product.deleteMany();

  for (const p of products) {
    await prisma.product.create({
      data: {
        ...p,
        // Packets start as their first priced batch.
        ...(p.type === ProductType.PACKET && p.stock > 0
          ? {
              batches: {
                create: {
                  costPrice: p.costPrice,
                  regularPrice: p.regularPrice,
                  salePrice: p.salePrice,
                  quantity: p.stock,
                  remaining: p.stock,
                },
              },
            }
          : {}),
      },
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
