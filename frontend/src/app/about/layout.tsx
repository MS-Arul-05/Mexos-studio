import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | MEXOS STUDIO",
  description: "Learn about Mexos Studio — our story, values, and mission to make premium custom apparel accessible to everyone.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
