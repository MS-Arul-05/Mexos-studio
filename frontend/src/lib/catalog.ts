'use client';

/**
 * API-backed catalog. Maps backend products onto the `Product` interface the
 * UI components already render (frontend id = backend slug for stable URLs),
 * and adds `variants` so checkout can resolve a (color, size) pair to the
 * backend variantId that orders require.
 */
import { useEffect, useState } from 'react';
import { api } from './api';
import type { Product } from '@/data/products';

export interface Variant {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  stock: number;
}

export interface ApiProduct extends Product {
  variants: Variant[];
}

interface BackendProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  originalPrice: string | null;
  fabric: string | null;
  careInfo: string | null;
  fit: string | null;
  gsm: string | null;
  tag: string | null;
  rating: number | null;
  reviewCount: number;
  category: { slug: string };
  images: { url: string }[];
  variants: Variant[];
  colors: { name: string; hex: string | null }[];
  sizes: string[];
  inStock: boolean;
}

function mapProduct(p: BackendProduct): ApiProduct {
  const images = p.images.length ? p.images.map((i) => i.url) : ['/images/categories/tshirt.png'];
  return {
    id: p.slug,
    name: p.name,
    price: Number(p.price),
    originalPrice: Number(p.originalPrice ?? p.price),
    category: p.category.slug,
    fit: p.fit ?? 'regular',
    rating: p.rating ?? 4.5,
    reviews: p.reviewCount,
    image: images[0],
    images,
    tag: p.tag ?? '',
    colors: p.colors.map((c) => ({ name: c.name, hex: c.hex ?? '#1F2937' })),
    sizes: p.sizes,
    description: p.description ?? '',
    fabric: p.fabric ?? '',
    gsm: p.gsm ?? '',
    care: p.careInfo ?? '',
    inStock: p.inStock,
    variants: p.variants,
  };
}

/** Find the backend variant id for a chosen color + size (checkout needs it). */
export function findVariantId(product: ApiProduct, color: string, size: string): string | null {
  return product.variants.find((v) => v.color === color && v.size === size)?.id ?? null;
}

export function useProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<BackendProduct[]>('/products?limit=100')
      .then((items) => setProducts(items.map(mapProduct)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  return { products, loading, error };
}

export function useProduct(slug: string | null) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    api
      .get<BackendProduct>(`/products/${slug}`)
      .then((p) => setProduct(mapProduct(p)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Product not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  return { product, loading, error };
}

export interface BackendOffer {
  id: string;
  title: string;
  description: string | null;
  couponCode: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: string;
  minOrderValue: string | null;
  endsAt: string;
}

export function useOffers() {
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get<BackendOffer[]>('/offers')
      .then(setOffers)
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);
  return { offers, loading };
}
