import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Drops POS",
  description: "Simple point-of-sale for products, stock and sales.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
