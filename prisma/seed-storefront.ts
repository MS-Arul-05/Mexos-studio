/**
 * Storefront seed — the Mexos Studio catalog the Next.js frontend displays,
 * plus the coupon offers from its /offers page so those codes actually work at
 * checkout. Idempotent (upsert by slug/code). Run: npm run seed:storefront
 *
 * Also deactivates the test-fixture products from seed.ts so the shop shows
 * only the real catalog (tests re-activate fixtures when they run seed()).
 */
import { DiscountType, Prisma } from '@prisma/client';
import { prisma } from '../src/config/prisma';

const CATEGORIES = [
  { name: 'T-Shirts', slug: 't-shirts' },
  { name: 'Hoodies', slug: 'hoodies' },
  { name: 'Polo Shirts', slug: 'polo' },
  { name: 'Sweatshirts', slug: 'sweatshirts' },
  { name: 'Jerseys', slug: 'jerseys' },
];

interface FrontProduct {
  slug: string;
  name: string;
  price: string;
  originalPrice: string;
  category: string;
  fit: string;
  rating: string;
  reviewCount: number;
  image: string;
  tag?: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  description: string;
  fabric: string;
  gsm: string;
  care: string;
}

// Mirrors frontend/src/data/products.ts — image paths are served by the
// Next.js app from its public/ directory.
const PRODUCTS: FrontProduct[] = [
  {
    slug: 'classic-round-neck',
    name: 'Classic Round Neck Tee',
    price: '499',
    originalPrice: '699',
    category: 't-shirts',
    fit: 'regular',
    rating: '4.7',
    reviewCount: 142,
    image: '/images/categories/tshirt.png',
    tag: 'Bestseller',
    colors: [
      { name: 'Charcoal', hex: '#1F2937' },
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Peach', hex: '#E9987A' },
      { name: 'Grey', hex: '#6B7280' },
      { name: 'Maroon', hex: '#7C2D12' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      'Our signature 180 GSM combed cotton tee — soft, breathable, and built to last. Perfect canvas for custom prints, embroidery, or as a premium blank.',
    fabric: '100% Combed Cotton',
    gsm: '180 GSM',
    care: 'Machine wash cold, tumble dry low',
  },
  {
    slug: 'oversized-drop-shoulder',
    name: 'Oversized Drop Shoulder Tee',
    price: '699',
    originalPrice: '999',
    category: 't-shirts',
    fit: 'oversized',
    rating: '4.8',
    reviewCount: 89,
    image: '/images/categories/tshirt.png',
    tag: 'New',
    colors: [
      { name: 'Black', hex: '#1F2937' },
      { name: 'Off-White', hex: '#FAF5F0' },
      { name: 'Sage', hex: '#A3B18A' },
      { name: 'Lavender', hex: '#B5A7D5' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      'Heavyweight 240 GSM cotton with a relaxed drop-shoulder silhouette. The streetwear staple that takes custom prints to the next level.',
    fabric: '100% Ring-Spun Cotton',
    gsm: '240 GSM',
    care: 'Machine wash cold, hang dry',
  },
  {
    slug: 'pullover-hoodie',
    name: 'Pullover Hoodie',
    price: '1299',
    originalPrice: '1799',
    category: 'hoodies',
    fit: 'regular',
    rating: '4.9',
    reviewCount: 203,
    image: '/images/categories/hoodie.png',
    tag: 'Bestseller',
    colors: [
      { name: 'Black', hex: '#1F2937' },
      { name: 'Grey Melange', hex: '#9CA3AF' },
      { name: 'Navy', hex: '#1E3A5F' },
      { name: 'Olive', hex: '#3B5249' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      '330 GSM fleece-lined hoodie with a cozy kangaroo pocket and adjustable drawstring hood. Premium blank ready for your custom artwork.',
    fabric: '80% Cotton / 20% Polyester Fleece',
    gsm: '330 GSM',
    care: 'Machine wash cold, tumble dry low',
  },
  {
    slug: 'zip-up-hoodie',
    name: 'Zip-Up Hoodie',
    price: '1499',
    originalPrice: '1999',
    category: 'hoodies',
    fit: 'regular',
    rating: '4.6',
    reviewCount: 67,
    image: '/images/categories/hoodie.png',
    colors: [
      { name: 'Black', hex: '#1F2937' },
      { name: 'White', hex: '#FFFFFF' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      'Full-zip hoodie with a clean finish and metal YKK zipper. Versatile layering piece that works as a premium blank or custom canvas.',
    fabric: '80% Cotton / 20% Polyester Fleece',
    gsm: '320 GSM',
    care: 'Machine wash cold, tumble dry low',
  },
  {
    slug: 'corporate-polo',
    name: 'Corporate Polo Shirt',
    price: '799',
    originalPrice: '999',
    category: 'polo',
    fit: 'regular',
    rating: '4.5',
    reviewCount: 95,
    image: '/images/categories/polo.png',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Black', hex: '#1F2937' },
      { name: 'Navy', hex: '#1E3A5F' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      'Professional pique-knit polo with ribbed collar and cuffs. Ideal for corporate branding, team uniforms, and events.',
    fabric: '100% Cotton Pique',
    gsm: '220 GSM',
    care: 'Machine wash cold, iron on low',
  },
  {
    slug: 'cricket-jersey',
    name: 'Cricket Team Jersey',
    price: '899',
    originalPrice: '1299',
    category: 'jerseys',
    fit: 'regular',
    rating: '4.7',
    reviewCount: 58,
    image: '/images/categories/jersey.png',
    tag: 'New',
    colors: [{ name: 'Custom', hex: 'custom' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    description:
      'Moisture-wicking sublimation jersey built for performance. Full custom design — your team, your colors, your name and number.',
    fabric: '100% Polyester Mesh',
    gsm: '160 GSM',
    care: 'Machine wash cold, do not iron on print',
  },
  {
    slug: 'premium-sweatshirt',
    name: 'Premium Sweatshirt',
    price: '1099',
    originalPrice: '1499',
    category: 'sweatshirts',
    fit: 'oversized',
    rating: '4.8',
    reviewCount: 76,
    image: '/images/categories/hoodie.png',
    colors: [
      { name: 'Black', hex: '#1F2937' },
      { name: 'Peach', hex: '#E9987A' },
      { name: 'Grey', hex: '#9CA3AF' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      'Oversized crew-neck sweatshirt with brushed fleece interior. Minimalist design that pairs perfectly with custom embroidery.',
    fabric: '80% Cotton / 20% Polyester',
    gsm: '300 GSM',
    care: 'Machine wash cold, tumble dry low',
  },
  {
    slug: 'graphic-tee-wave',
    name: 'Graphic Tee — Wave',
    price: '599',
    originalPrice: '799',
    category: 't-shirts',
    fit: 'regular',
    rating: '4.6',
    reviewCount: 45,
    image: '/images/categories/tshirt.png',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Black', hex: '#1F2937' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      "Premium DTG-printed graphic tee with a clean wave design. Soft hand feel that won't crack or fade after washing.",
    fabric: '100% Combed Cotton',
    gsm: '180 GSM',
    care: 'Machine wash cold inside out, tumble dry low',
  },
  {
    slug: 'henley-neck-tee',
    name: 'Henley Neck Tee',
    price: '549',
    originalPrice: '749',
    category: 't-shirts',
    fit: 'regular',
    rating: '4.4',
    reviewCount: 38,
    image: '/images/products/henley-green.png',
    colors: [
      { name: 'Olive', hex: '#3B5249' },
      { name: 'Black', hex: '#1F2937' },
      { name: 'White', hex: '#FFFFFF' },
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description:
      'Classic henley with 3-button placket and slightly tapered fit. A refined everyday tee that works for custom embroidery.',
    fabric: '100% Combed Cotton',
    gsm: '190 GSM',
    care: 'Machine wash cold, tumble dry low',
  },
  {
    slug: 'sleeveless-jersey',
    name: 'Sleeveless Sports Jersey',
    price: '749',
    originalPrice: '999',
    category: 'jerseys',
    fit: 'regular',
    rating: '4.5',
    reviewCount: 42,
    image: '/images/categories/jersey.png',
    colors: [{ name: 'Custom', hex: 'custom' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    description:
      'Lightweight sleeveless jersey for basketball, volleyball, and indoor sports. Full sublimation printing for vibrant all-over designs.',
    fabric: '100% Polyester Mesh',
    gsm: '150 GSM',
    care: 'Machine wash cold, do not iron on print',
  },
];

// Coupons shown on the frontend /offers page — seeded so they work at checkout.
// (B2G1FREE is approximated as 33% off ≥3 items' value: buy-X-get-Y mechanics
// aren't supported by the pricing engine; 33% off a 3-item order is equivalent.)
const OFFERS = [
  {
    code: 'SUMMER40',
    title: 'Summer Sale — 40% Off',
    description: 'Flat 40% off sitewide. Limited period.',
    type: DiscountType.PERCENTAGE,
    value: '40',
    min: null,
  },
  {
    code: 'WELCOME25',
    title: 'Welcome Offer — 25% Off',
    description: '25% off your first order.',
    type: DiscountType.PERCENTAGE,
    value: '25',
    min: null,
    maxPerUser: 1,
  },
  {
    code: 'B2G1FREE',
    title: 'Buy 2 Get 1 Free',
    description: '≈33% off when you buy 3 or more (equivalent value).',
    type: DiscountType.PERCENTAGE,
    value: '33',
    min: '1497',
  },
  {
    code: 'BULK100',
    title: 'Bulk Saver — ₹100 Off',
    description: '₹100 off on orders above ₹999.',
    type: DiscountType.FLAT,
    value: '100',
    min: '999',
  },
  {
    code: 'COMBO500',
    title: 'Combo Deal — ₹500 Off',
    description: '₹500 off on orders above ₹2499.',
    type: DiscountType.FLAT,
    value: '500',
    min: '2499',
  },
] as const;

// Test-fixture slugs (seed.ts) hidden from the storefront catalog.
const FIXTURE_SLUGS = [
  'retro-sunset-graphic-tee',
  'mountain-line-art-tee',
  'neon-wave-graphic-tee',
  'classic-crew-neck',
  'premium-v-neck',
  'pima-cotton-basic',
  'heavyweight-oversized-tee',
  'acid-wash-oversized',
  'custom-name-tee',
  'custom-photo-print-tee',
  'team-jersey-custom-tee',
];

export async function seedStorefront(): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
    categoryIdBySlug.set(c.slug, row.id);
  }

  // Hide the test fixtures from the shop (storefront slugs are excluded so the
  // shared 'oversized-drop-shoulder' slug stays active with storefront data).
  await prisma.product.updateMany({
    where: { slug: { in: FIXTURE_SLUGS } },
    data: { isActive: false },
  });

  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.category)!;
    const fields = {
      name: p.name,
      description: p.description,
      price: new Prisma.Decimal(p.price),
      originalPrice: new Prisma.Decimal(p.originalPrice),
      fabric: p.fabric,
      careInfo: p.care,
      gsm: p.gsm,
      fit: p.fit,
      tag: p.tag ?? null,
      rating: new Prisma.Decimal(p.rating),
      reviewCount: p.reviewCount,
      categoryId,
      isFeatured: p.tag === 'Bestseller' || p.tag === 'New',
      isActive: true,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: fields,
      create: { slug: p.slug, ...fields },
    });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: { productId: product.id, url: p.image, altText: p.name, sortOrder: 0 },
    });

    for (const color of p.colors) {
      for (const size of p.sizes) {
        const sku = `${p.slug}-${size}-${color.name}`.toUpperCase().replace(/[^A-Z0-9]+/g, '-');
        await prisma.productVariant.upsert({
          where: { sku },
          update: { stock: 50, colorHex: color.hex },
          create: {
            productId: product.id,
            size,
            color: color.name,
            colorHex: color.hex,
            stock: 50,
            sku,
          },
        });
      }
    }
  }

  for (const o of OFFERS) {
    const existing = await prisma.offer.findFirst({ where: { couponCode: o.code } });
    const data = {
      title: o.title,
      description: o.description,
      couponCode: o.code,
      discountType: o.type,
      discountValue: new Prisma.Decimal(o.value),
      minOrderValue: o.min ? new Prisma.Decimal(o.min) : null,
      maxRedemptionsPerUser: 'maxPerUser' in o ? o.maxPerUser : null,
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2027-12-31T23:59:59Z'),
      isActive: true,
    };
    if (existing) await prisma.offer.update({ where: { id: existing.id }, data });
    else await prisma.offer.create({ data });
  }
}

if (require.main === module) {
  seedStorefront()
    .then(async () => {
      const [products, variants, offers] = await Promise.all([
        prisma.product.count({ where: { isActive: true } }),
        prisma.productVariant.count(),
        prisma.offer.count({ where: { isActive: true } }),
      ]);
      // eslint-disable-next-line no-console
      console.log(
        `✅ Storefront seed: ${products} active products, ${variants} variants, ${offers} offers.`,
      );
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
