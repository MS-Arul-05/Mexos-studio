import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Design Studio | MEXOS STUDIO",
  description: "Design your own custom T-shirt, hoodie, or polo. Choose fabric, print type, colors, and upload your artwork.",
};

export default function CustomizeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
