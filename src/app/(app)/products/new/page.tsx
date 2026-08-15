import Link from "next/link";
import { NewProductForm } from "./new-product-form";

export default function NewProductPage() {
  return (
    <div>
      <div className="mb-5">
        <Link
          href="/products"
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New product</h1>
        <p className="text-sm text-slate-500">
          Add a product with its Sinhala name and prices.
        </p>
      </div>

      <NewProductForm />
    </div>
  );
}
