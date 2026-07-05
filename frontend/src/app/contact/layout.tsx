import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | MEXOS STUDIO",
  description: "Get in touch with Mexos Studio. Reach us via WhatsApp, email, or visit our store for custom apparel inquiries.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
