export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  category: string;
  fit: string;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  tag: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  description: string;
  fabric: string;
  gsm: string;
  care: string;
  inStock: boolean;
}

export const products: Product[] = [
  {
    id: 'classic-round-neck',
    name: 'Classic Round Neck Tee',
    price: 499,
    originalPrice: 699,
    category: 't-shirts',
    fit: 'regular',
    rating: 4.7,
    reviews: 142,
    image: '/images/categories/tshirt.png',
    images: [
      '/images/categories/tshirt.png',
      '/images/categories/tshirt.png',
      '/images/categories/tshirt.png',
    ],
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
    inStock: true,
  },
  {
    id: 'oversized-drop-shoulder',
    name: 'Oversized Drop Shoulder Tee',
    price: 699,
    originalPrice: 999,
    category: 't-shirts',
    fit: 'oversized',
    rating: 4.8,
    reviews: 89,
    image: '/images/categories/tshirt.png',
    images: ['/images/categories/tshirt.png', '/images/categories/tshirt.png'],
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
    inStock: true,
  },
  {
    id: 'pullover-hoodie',
    name: 'Pullover Hoodie',
    price: 1299,
    originalPrice: 1799,
    category: 'hoodies',
    fit: 'regular',
    rating: 4.9,
    reviews: 203,
    image: '/images/categories/hoodie.png',
    images: ['/images/categories/hoodie.png', '/images/categories/hoodie.png'],
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
    inStock: true,
  },
  {
    id: 'zip-up-hoodie',
    name: 'Zip-Up Hoodie',
    price: 1499,
    originalPrice: 1999,
    category: 'hoodies',
    fit: 'regular',
    rating: 4.6,
    reviews: 67,
    image: '/images/categories/hoodie.png',
    images: ['/images/categories/hoodie.png', '/images/categories/hoodie.png'],
    tag: '',
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
    inStock: true,
  },
  {
    id: 'corporate-polo',
    name: 'Corporate Polo Shirt',
    price: 799,
    originalPrice: 999,
    category: 'polo',
    fit: 'regular',
    rating: 4.5,
    reviews: 95,
    image: '/images/categories/polo.png',
    images: ['/images/categories/polo.png', '/images/categories/polo.png'],
    tag: '',
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
    inStock: true,
  },
  {
    id: 'cricket-jersey',
    name: 'Cricket Team Jersey',
    price: 899,
    originalPrice: 1299,
    category: 'jerseys',
    fit: 'regular',
    rating: 4.7,
    reviews: 58,
    image: '/images/categories/jersey.png',
    images: ['/images/categories/jersey.png', '/images/categories/jersey.png'],
    tag: 'New',
    colors: [{ name: 'Custom', hex: 'custom' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    description:
      'Moisture-wicking sublimation jersey built for performance. Full custom design — your team, your colors, your name and number.',
    fabric: '100% Polyester Mesh',
    gsm: '160 GSM',
    care: 'Machine wash cold, do not iron on print',
    inStock: true,
  },
  {
    id: 'premium-sweatshirt',
    name: 'Premium Sweatshirt',
    price: 1099,
    originalPrice: 1499,
    category: 'sweatshirts',
    fit: 'oversized',
    rating: 4.8,
    reviews: 76,
    image: '/images/categories/hoodie.png',
    images: ['/images/categories/hoodie.png', '/images/categories/hoodie.png'],
    tag: '',
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
    inStock: true,
  },
  {
    id: 'graphic-tee-wave',
    name: 'Graphic Tee — Wave',
    price: 599,
    originalPrice: 799,
    category: 't-shirts',
    fit: 'regular',
    rating: 4.6,
    reviews: 45,
    image: '/images/categories/tshirt.png',
    images: ['/images/categories/tshirt.png'],
    tag: '',
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
    inStock: true,
  },
  {
    id: 'henley-neck-tee',
    name: 'Henley Neck Tee',
    price: 549,
    originalPrice: 749,
    category: 't-shirts',
    fit: 'regular',
    rating: 4.4,
    reviews: 38,
    image: '/images/products/henley-green.png',
    images: ['/images/products/henley-green.png', '/images/products/henley-green.png'],
    tag: '',
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
    inStock: true,
  },
  {
    id: 'sleeveless-jersey',
    name: 'Sleeveless Sports Jersey',
    price: 749,
    originalPrice: 999,
    category: 'jerseys',
    fit: 'regular',
    rating: 4.5,
    reviews: 42,
    image: '/images/categories/jersey.png',
    images: ['/images/categories/jersey.png'],
    tag: '',
    colors: [{ name: 'Custom', hex: 'custom' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    description:
      'Lightweight sleeveless jersey for basketball, volleyball, and indoor sports. Full sublimation printing for vibrant all-over designs.',
    fabric: '100% Polyester Mesh',
    gsm: '150 GSM',
    care: 'Machine wash cold, do not iron on print',
    inStock: true,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.id === slug);
}

export const categories = [
  { key: 'all', label: 'All Products' },
  { key: 't-shirts', label: 'T-Shirts' },
  { key: 'hoodies', label: 'Hoodies' },
  { key: 'polo', label: 'Polo Shirts' },
  { key: 'sweatshirts', label: 'Sweatshirts' },
  { key: 'jerseys', label: 'Jerseys' },
];

/** Map URL-friendly slugs (from home page links like /shop/tshirts) to category keys */
export const categorySlugMap: Record<string, string> = {
  tshirts: 't-shirts',
  't-shirts': 't-shirts',
  hoodies: 'hoodies',
  polo: 'polo',
  polos: 'polo',
  sweatshirts: 'sweatshirts',
  jerseys: 'jerseys',
};
