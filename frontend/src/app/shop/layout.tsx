import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop | MEXOS STUDIO",
  description: "Browse our collection of premium custom T-shirts, hoodies, polos, and more. Quality apparel designed for you.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
