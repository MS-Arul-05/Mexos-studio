import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk Orders | MEXOS STUDIO",
  description: "Order custom apparel in bulk for your team, event, or business. Competitive pricing on 10+ pieces.",
};

export default function BulkOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
