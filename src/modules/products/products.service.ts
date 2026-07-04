import { productsRepository, type ProductWithRelations } from './products.repository';
import type { ListProductsQuery } from './products.schemas';
import type { PaginationMeta } from '../../utils/response';
import { AppError } from '../../utils/app-error';
import { decimalToString } from '../../utils/serialize';

/** Public product shape (Decimal money serialized to string). */
export function serializeProduct(p: ProductWithRelations) {
  // Storefront conveniences derived from variants: distinct colors (with swatch
  // hex), distinct sizes, and overall availability.
  const colorMap = new Map<string, string | null>();
  const sizeSet = new Set<string>();
  for (const v of p.variants) {
    if (!colorMap.has(v.color)) colorMap.set(v.color, v.colorHex);
    sizeSet.add(v.size);
  }
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: decimalToString(p.price),
    originalPrice: decimalToString(p.originalPrice),
    currency: p.currency,
    fabric: p.fabric,
    careInfo: p.careInfo,
    fit: p.fit,
    gsm: p.gsm,
    tag: p.tag,
    rating: p.rating ? Number(p.rating) : null,
    reviewCount: p.reviewCount,
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
    images: p.images.map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.altText,
      sortOrder: img.sortOrder,
    })),
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      sku: v.sku,
    })),
    colors: [...colorMap.entries()].map(([name, hex]) => ({ name, hex })),
    sizes: [...sizeSet],
    inStock: p.variants.some((v) => v.stock > 0),
    createdAt: p.createdAt,
  };
}

export type SerializedProduct = ReturnType<typeof serializeProduct>;

export const productsService = {
  async list(
    query: ListProductsQuery,
  ): Promise<{ items: SerializedProduct[]; meta: PaginationMeta }> {
    const { items, total } = await productsRepository.list(query);
    return {
      items: items.map(serializeProduct),
      meta: { page: query.page, limit: query.limit, total },
    };
  },

  async getBySlug(slug: string): Promise<SerializedProduct> {
    const product = await productsRepository.findActiveBySlug(slug);
    if (!product) {
      throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
    }
    return serializeProduct(product);
  },
};
