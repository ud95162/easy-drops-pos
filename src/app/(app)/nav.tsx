"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./actions";

const links = [
  { href: "/pos", label: "POS / Sell" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Add Stock" },
  { href: "/sales", label: "Sales History" },
  { href: "/customers", label: "Customers" },
  { href: "/reports", label: "Reports" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <Link href="/pos" className="shrink-0">
          {/* EasyDrops logo (transparent background) */}
          <img
            src="/logo-mark.png"
            alt="EasyDrops"
            className="h-8 w-auto sm:h-9"
          />
        </Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout} className="shrink-0">
          <button
            type="submit"
            className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:px-3"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
