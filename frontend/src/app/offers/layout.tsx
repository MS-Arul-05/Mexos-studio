import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offers & Deals | MEXOS STUDIO",
  description: "Exclusive offers on custom apparel. Save on T-shirts, hoodies, and bulk orders with our coupon codes.",
};

export default function OffersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
