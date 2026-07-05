import type { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface BackendProduct {
  name: string;
  slug: string;
  description: string | null;
  price: string;
  originalPrice: string | null;
  category: { slug: string };
  images: { url: string }[];
}

async function fetchProduct(slug: string): Promise<BackendProduct | null> {
  try {
    const res = await fetch(`${API_BASE}/products/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return { title: "Product Not Found | MEXOS STUDIO" };
  }

  const price = Number(product.price);
  const image = product.images[0]?.url;

  return {
    title: `${product.name} | MEXOS STUDIO`,
    description:
      product.description ||
      `Buy ${product.name} at ₹${price}. Premium custom apparel from Mexos Studio.`,
    openGraph: {
      title: product.name,
      description:
        product.description || `Premium custom apparel - ₹${price}`,
      ...(image ? { images: [{ url: image }] } : {}),
      type: "website",
    },
  };
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
