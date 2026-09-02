import { PrismaClient } from "@prisma/client";

/**
 * Resolve the database URL from any of the common env var names.
 * Vercel's Prisma Postgres integration may expose it under a prefixed
 * name (e.g. easy_drops_POSTGRES_URL) rather than DATABASE_URL.
 */
function resolveDatabaseUrl(): string | undefined {
  const isDirectPostgres = (v?: string) =>
    !!v && (v.startsWith("postgres://") || v.startsWith("postgresql://"));

  if (isDirectPostgres(process.env.DATABASE_URL)) {
    return process.env.DATABASE_URL;
  }

  // Fall back to a *_DATABASE_URL / *_POSTGRES_URL / *_PRISMA_DATABASE_URL
  // variable that Vercel storage integrations create (e.g. easy_drops_...).
  // Only accept direct postgres URLs; skip Accelerate "prisma://" URLs which
  // need a different client setup.
  const candidates = Object.entries(process.env).filter(
    ([key]) =>
      /(^|_)DATABASE_URL$/.test(key) ||
      /(^|_)POSTGRES_URL$/.test(key) ||
      /(^|_)PRISMA_DATABASE_URL$/.test(key)
  );
  const match = candidates.find(([, value]) => isDirectPostgres(value));
  return match?.[1] ?? process.env.DATABASE_URL;
}

const databaseUrl = resolveDatabaseUrl();

function createPrisma() {
  return new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
    // Never load heavy image bytes unless a query explicitly selects them
    // (the /api/products/[id]/image route does).
    omit: {
      product: { imageData: true },
      ecomProduct: { imageData: true },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrisma> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
