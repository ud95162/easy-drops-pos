# Easy Drops POS

A simple point-of-sale (POS) system built with **Next.js (App Router)**, **Prisma**, and **PostgreSQL**, ready to deploy on **Vercel**.

## Features

- **Products** — create/edit products with an English name and a **Sinhala name** (the Sinhala name is what prints on the receipt).
- **Two product types**
  - **Loose items** (e.g. sugar, rice, dhal) — sold by weight. When you **add new stock, the new prices replace** the product's current prices.
  - **Packet items** (e.g. milk powder, tea) — sold at their fixed prices. Adding stock only increases quantity; prices stay the same.
- **Price fields** — every product keeps a **cost price**, **regular price**, and **sale price**. Sales use the sale price.
- **Add stock** — record incoming stock with a history log.
- **POS / Sell** — fast search, tap to add to cart, adjust quantities, take cash, see change.
- **Receipt** — printable 80 mm receipt showing the **Sinhala names**, quantities, total, paid and change.
- **Sales history** — recent sales and today's total.
- **Login** — a single shared cashier password protects the whole app.
- **Currency** — Sri Lankan Rupees (Rs.).

## Tech stack

- Next.js 15 (App Router, Server Actions)
- React 19 + TypeScript
- Tailwind CSS
- Prisma ORM + PostgreSQL

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

- `DATABASE_URL` — a PostgreSQL connection string. For local development you can use a local Postgres database, e.g. `postgresql://youruser@localhost:5432/easydrops`.
- `POS_PASSWORD` — the password cashiers type to log in.
- `AUTH_SECRET` — a long random string used to sign the session cookie. Generate one with `openssl rand -base64 32`.

### 3. Create the database tables and seed demo data

```bash
npm run db:push
npm run db:seed   # optional: loads a few demo products
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>, log in with your `POS_PASSWORD`, and start selling.

---

## Deploying to Vercel

1. **Create a Postgres database.** The easiest free options are [Neon](https://neon.tech) or **Vercel Postgres** (Storage tab in your Vercel project). Copy the **pooled** connection string.

2. **Push this project to GitHub** (or GitLab/Bitbucket).

3. **Import the repo into Vercel** (New Project → Import).

4. **Add environment variables** in the Vercel project settings (Settings → Environment Variables):

   | Name           | Value                                             |
   | -------------- | ------------------------------------------------- |
   | `DATABASE_URL` | your Postgres pooled connection string            |
   | `POS_PASSWORD` | the cashier password                              |
   | `AUTH_SECRET`  | a long random string (`openssl rand -base64 32`)  |

5. **Deploy.** The build command (`prisma generate && prisma db push && next build`) automatically creates the database tables on the first deploy.

6. *(Optional)* To load demo products in production, run `npm run db:seed` locally with the production `DATABASE_URL` set.

> **Note:** the app uses `prisma db push` to sync the schema on each build. This is fine for a small single-user shop. If you later want versioned migrations, switch to `prisma migrate`.

---

## Project structure

```
prisma/
  schema.prisma        # Product, StockEntry, Sale, SaleItem models
  seed.ts              # demo products
src/
  lib/
    prisma.ts          # Prisma client singleton
    auth.ts            # password login + signed cookie session
    money.ts           # LKR formatting + Decimal helpers
    products.ts        # product serialization for the client
  app/
    login/             # login page + action
    (app)/             # authenticated area (nav + layout)
      pos/             # POS / sell + receipt
      products/        # product CRUD
      stock/           # add stock (loose price update logic)
      sales/           # sales history
```

## How the loose vs. packet pricing works

- On the **Add Stock** page, when you pick a **loose** product, extra fields appear for the new **cost / regular / sale** price. Submitting adds the quantity **and** overwrites the product's prices with the new batch prices.
- When you pick a **packet** product, no price fields appear — only the quantity is added, and the product keeps its existing prices.

## Security notes

- All prices and stock checks are recomputed on the server during checkout, so client-side tampering can't change what a sale costs.
- Product names are snapshotted onto each sale, so receipts and history stay accurate even if a product is later renamed or deleted.
