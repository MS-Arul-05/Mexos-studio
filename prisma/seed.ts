/**
 * Seed (Epic 2.6 / Task B): >=3 categories, >=10 sample products (each with images
 * + size/color variants) and one sample offer. Idempotent (upsert by slug), so it's
 * safe to re-run and safe to call from integration tests to guarantee fixtures.
 *
 * Uses the shared Prisma client so tests share one connection. Run standalone via
 * `npm run seed` (the CLI guard at the bottom handles connection teardown).
 */
import { DiscountType, Prisma } from '@prisma/client';
import { prisma } from '../src/config/prisma';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
const COLORS = ['Black', 'White', 'Navy'] as const;

interface SeedProduct {
  name: string;
  slug: string;
  description: string;
  price: string; // Decimal as string to avoid float
  fabric: string;
  categorySlug: string;
  isFeatured?: boolean;
}

const categories = [
  { name: 'Graphic Tees', slug: 'graphic-tees' },
  { name: 'Plain Basics', slug: 'plain-basics' },
  { name: 'Oversized', slug: 'oversized' },
  { name: 'Custom & Personalized', slug: 'custom-personalized' },
];

const products: SeedProduct[] = [
  {
    name: 'Retro Sunset Graphic Tee',
    slug: 'retro-sunset-graphic-tee',
    description: 'Soft cotton tee with a retro sunset print.',
    price: '699.00',
    fabric: '100% Combed Cotton',
    categorySlug: 'graphic-tees',
    isFeatured: true,
  },
  {
    name: 'Mountain Line Art Tee',
    slug: 'mountain-line-art-tee',
    description: 'Minimal mountain line-art graphic.',
    price: '649.00',
    fabric: '100% Combed Cotton',
    categorySlug: 'graphic-tees',
  },
  {
    name: 'Neon Wave Graphic Tee',
    slug: 'neon-wave-graphic-tee',
    description: 'Bold neon wave print for a standout look.',
    price: '749.00',
    fabric: '100% Combed Cotton',
    categorySlug: 'graphic-tees',
    isFeatured: true,
  },
  {
    name: 'Classic Crew Neck',
    slug: 'classic-crew-neck',
    description: 'Everyday classic crew-neck basic.',
    price: '499.00',
    fabric: '100% Cotton',
    categorySlug: 'plain-basics',
  },
  {
    name: 'Premium V-Neck',
    slug: 'premium-v-neck',
    description: 'Premium combed-cotton V-neck.',
    price: '549.00',
    fabric: '100% Combed Cotton',
    categorySlug: 'plain-basics',
  },
  {
    name: 'Pima Cotton Basic',
    slug: 'pima-cotton-basic',
    description: 'Ultra-soft Pima cotton essential.',
    price: '899.00',
    fabric: 'Pima Cotton',
    categorySlug: 'plain-basics',
    isFeatured: true,
  },
  {
    name: 'Oversized Drop Shoulder',
    slug: 'oversized-drop-shoulder',
    description: 'Relaxed oversized fit with drop shoulders.',
    price: '799.00',
    fabric: '240 GSM Cotton',
    categorySlug: 'oversized',
  },
  {
    name: 'Heavyweight Oversized Tee',
    slug: 'heavyweight-oversized-tee',
    description: 'Structured heavyweight oversized tee.',
    price: '849.00',
    fabric: '260 GSM Cotton',
    categorySlug: 'oversized',
    isFeatured: true,
  },
  {
    name: 'Acid Wash Oversized',
    slug: 'acid-wash-oversized',
    description: 'Vintage acid-wash oversized tee.',
    price: '999.00',
    fabric: '240 GSM Cotton',
    categorySlug: 'oversized',
  },
  {
    name: 'Custom Name Tee',
    slug: 'custom-name-tee',
    description: 'Add your name or text — personalized print.',
    price: '599.00',
    fabric: '100% Cotton',
    categorySlug: 'custom-personalized',
  },
  {
    name: 'Custom Photo Print Tee',
    slug: 'custom-photo-print-tee',
    description: 'Upload a photo for a full-front print.',
    price: '899.00',
    fabric: '100% Cotton',
    categorySlug: 'custom-personalized',
  },
  {
    name: 'Team Jersey Custom Tee',
    slug: 'team-jersey-custom-tee',
    description: 'Custom team jersey with number and name.',
    price: '749.00',
    fabric: 'Dri-Fit Polyester',
    categorySlug: 'custom-personalized',
  },
];

export interface SeedResult {
  categories: number;
  products: number;
  variants: number;
  offers: number;
}

export async function seed(): Promise<SeedResult> {
  // Categories
  const categoryIdBySlug = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: { name: c.name, slug: c.slug },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }

  // Products + images + variants
  for (const p of products) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Missing category for product ${p.slug}`);

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: new Prisma.Decimal(p.price),
        fabric: p.fabric,
        categoryId,
        isFeatured: p.isFeatured ?? false,
        // Re-activate: the storefront seed (seed-storefront.ts) hides these
        // fixtures from the shop; tests re-running seed() restore them.
        isActive: true,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: new Prisma.Decimal(p.price),
        fabric: p.fabric,
        categoryId,
        isFeatured: p.isFeatured ?? false,
      },
    });

    // One primary image (idempotent: clear + recreate for this product)
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `https://picsum.photos/seed/${p.slug}/600/600`,
        altText: p.name,
        sortOrder: 0,
      },
    });

    // Variants: every size x color, sku unique per product-size-color
    for (const size of SIZES) {
      for (const color of COLORS) {
        const sku = `${p.slug}-${size}-${color}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
        await prisma.productVariant.upsert({
          where: { sku },
          update: { stock: 25 },
          create: { productId: product.id, size, color, stock: 25, sku },
        });
      }
    }
  }

  // One sample offer
  await prisma.offer.upsert({
    where: { id: 'seed-launch-offer' },
    update: {},
    create: {
      id: 'seed-launch-offer',
      title: 'Launch Offer — 20% Off',
      description: 'Flat 20% off on all tees for launch week.',
      couponCode: 'LAUNCH20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: new Prisma.Decimal('20.00'),
      minOrderValue: new Prisma.Decimal('499.00'),
      startsAt: new Date('2026-07-01T00:00:00Z'),
      endsAt: new Date('2026-12-31T23:59:59Z'),
      isActive: true,
    },
  });

  const [catCount, prodCount, variantCount, offerCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.offer.count(),
  ]);

  return {
    categories: catCount,
    products: prodCount,
    variants: variantCount,
    offers: offerCount,
  };
}

// CLI runner: `npm run seed` / `prisma db seed`
if (require.main === module) {
  seed()
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(
        `✅ Seed complete: ${r.categories} categories, ${r.products} products, ${r.variants} variants, ${r.offers} offer(s).`,
      );
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
